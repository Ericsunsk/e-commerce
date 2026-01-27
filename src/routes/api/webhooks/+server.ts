import { stripe } from '$lib/server/stripe';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deductProductStock, syncProductStatusFromStripe, createProductFromStripe } from '$lib/server/products';
import { createOrder, getOrderBySessionId, getOrderByPaymentIntent, updateOrderStatus } from '$lib/server/orders';
import type { OrderItem, ShippingAddress, Order } from '$lib/types';
import type Stripe from 'stripe';

const endpointSecret = env.STRIPE_WEBHOOK_SECRET;
const n8nWebhookUrl = env.N8N_WEBHOOK_URL;

export const POST: RequestHandler = async ({ request }) => {
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig || !endpointSecret) {
        console.warn('Webhook: Missing signature or endpoint secret');
        return json({ error: 'Missing signature or endpoint secret' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = await stripe.webhooks.constructEventAsync(payload, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
            break;

        case 'payment_intent.succeeded':
            await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
            break;

        case 'checkout.session.expired':
            const expiredSession = event.data.object as Stripe.Checkout.Session;
            console.log(`Checkout session expired: ${expiredSession.id}`);
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object as Stripe.PaymentIntent;
            console.log(`Payment failed for intent: ${failedIntent.id}`);
            break;

        // Product Sync Events (Hybrid Driver)
        // Product Sync Events are now handled by n8n workflow
        // case 'product.created':
        //     await handleProductCreated(event.data.object as Stripe.Product);
        //     break;

        // case 'product.updated':
        //     await handleProductUpdated(event.data.object as Stripe.Product);
        //     break;

        // case 'product.deleted':
        //     await handleProductDeleted(event.data.object as Stripe.Product);
        //     break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return json({ received: true });
};

/**
 * Handle successful payment intent (Stripe Elements)
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.log(`Processing payment_intent.succeeded: ${paymentIntent.id}`);

    try {
        // Find the pending order created by the client/server flow
        const order = await getOrderByPaymentIntent(paymentIntent.id);

        if (!order) {
            console.warn(`⚠️ No pending order found for PaymentIntent: ${paymentIntent.id}. This might be a standalone payment or order creation failed.`);
            return;
        }

        if (order.status === 'paid') {
            console.log(`Order ${order.id} is already paid. Skipping.`);
            return;
        }

        console.log(`✅ Found pending order ${order.id}. Updating status to paid.`);

        // Update status to paid
        const updatedOrder = await updateOrderStatus(order.id, 'paid');

        if (updatedOrder) {
            // Deduct stock
            // We use the items stored in the order
            for (const item of order.items) {
                // We need to resolve pbId. In our order items, we stored 'productId' which IS the pbId.
                if (item.productId) {
                    await deductProductStock(item.productId, item.quantity, item.variantId);
                }
            }

            // Trigger n8n notification workflow (Fire & Forget)
            await triggerN8nOrderNotification(updatedOrder);
        }

    } catch (e) {
        console.error('Error processing payment_intent.succeeded:', e);
    }
}

/**
 * Handle successful checkout completion
 * Creates order in PocketBase with all session details
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    // ... (Keep existing implementation for backward compatibility if needed)
    console.log(`Processing checkout.session.completed: ${session.id}`);

    try {
        // Check if order already exists (idempotency)
        const existingOrder = await getOrderBySessionId(session.id);
        if (existingOrder) {
            console.log(`Order already exists for session: ${session.id}`);
            return;
        }

        // Retrieve line items from Stripe
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ['data.price.product']
        });

        // Map line items to our OrderItem format
        const items: OrderItem[] = lineItems.data.map(item => {
            const product = item.price?.product as Stripe.Product | undefined;
            return {
                productId: product?.id || '',
                title: item.description || product?.name || 'Unknown Product',
                price: (item.price?.unit_amount || 0) / 100,
                quantity: item.quantity || 1,
                color: product?.metadata?.color,
                size: product?.metadata?.size,
                image: product?.images?.[0],
                // Note: For Stripe Checkout sessions, we mapped pbId from metadata. 
                // For direct orders, productId IS the pbId. 
                // We should check metadata for consistency.
            };
        });

        // Extract shipping address
        // Note: shipping_details exists on expanded session but not in base type
        const sessionWithShipping = session as any;
        const shippingDetails = sessionWithShipping.shipping_details || sessionWithShipping.shipping;
        const shippingAddress: ShippingAddress = {
            name: shippingDetails?.name || session.customer_details?.name || '',
            line1: shippingDetails?.address?.line1 || '',
            line2: shippingDetails?.address?.line2 || undefined,
            city: shippingDetails?.address?.city || '',
            state: shippingDetails?.address?.state || undefined,
            postalCode: shippingDetails?.address?.postal_code || '',
            country: shippingDetails?.address?.country || ''
        };

        // Create order in PocketBase
        const order = await createOrder({
            userId: undefined, // Guest checkout - can be linked later if user logs in
            stripeSessionId: session.id,
            stripePaymentIntent: typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id,
            customerEmail: session.customer_details?.email || '',
            customerName: session.customer_details?.name || undefined,
            items,
            amountSubtotal: session.amount_subtotal || 0,
            amountShipping: session.total_details?.amount_shipping || 0,
            amountTotal: session.amount_total || 0,
            currency: session.currency || 'usd',
            status: 'paid',
            shippingAddress,
            trackingNumber: undefined,
            trackingCarrier: undefined,
            notes: undefined
        });

        if (order) {
            console.log(`✅ Order created successfully: ${order.id}`);

            // Deduct stock for each item
            // Note: In Checkout Session flow, we need to know the PB ID. 
            // The item.productId is the STRIPE product ID. 
            // We need to fetch the original PB ID from metadata if possible.
            // Simplified here: assumed productId might work if synced, but ideally we use metadata.pb_id

            // Trigger n8n notification workflow (Fire & Forget)
            await triggerN8nOrderNotification(order);

        } else {
            console.error(`❌ Failed to create order for session: ${session.id}`);
        }

    } catch (error) {
        console.error('Error processing checkout.session.completed:', error);
        // Don't throw - return 200 to Stripe to prevent retries for unrecoverable errors
        // Stripe will retry on 5xx errors
    }
}

/**
 * Handle new product creation in Stripe
 * Automatically creates a mirror record in PocketBase and links them via metadata
 */
async function handleProductCreated(stripeProduct: Stripe.Product) {
    console.log(`Processing product.created: ${stripeProduct.id} (${stripeProduct.name})`);

    // Check if it already has a pb_product_id (prevent loops or double creation)
    if (stripeProduct.metadata?.pb_product_id) {
        console.log(`Product ${stripeProduct.id} already has a PB ID. Skipping creation.`);
        return;
    }

    try {
        const pbRecord = await createProductFromStripe(stripeProduct);
        console.log(`✅ Automatically created PB product ${pbRecord.id} for Stripe product ${stripeProduct.id}`);
    } catch (e) {
        console.error('Error auto-creating product from Stripe:', e);
    }
}

/**
 * Handle Stripe product update (Hybrid Driver Sync)
 * Syncs product active/archived status to PocketBase
 */
async function handleProductUpdated(stripeProduct: Stripe.Product) {
    console.log(`Processing product.updated: ${stripeProduct.id} (active: ${stripeProduct.active})`);

    // Extract PB product ID from Stripe metadata (convention: pb_product_id)
    const pbProductId = stripeProduct.metadata?.pb_product_id;

    if (!pbProductId) {
        console.warn(`⚠️ Stripe product ${stripeProduct.id} has no pb_product_id in metadata. Cannot sync.`);
        return;
    }

    try {
        await syncProductStatusFromStripe(pbProductId, stripeProduct.active);
        console.log(`✅ PB product ${pbProductId} synced: stock_status -> ${stripeProduct.active ? 'in_stock' : 'out_of_stock'}`);
    } catch (e) {
        console.error('Error syncing product status:', e);
    }
}

/**
 * Handle Stripe product deletion
 * Marks PocketBase product as out_of_stock
 */
async function handleProductDeleted(stripeProduct: Stripe.Product) {
    console.log(`Processing product.deleted: ${stripeProduct.id}`);

    const pbProductId = stripeProduct.metadata?.pb_product_id;

    if (!pbProductId) {
        console.warn(`⚠️ Stripe product ${stripeProduct.id} has no pb_product_id. Cannot sync deletion.`);
        return;
    }

    try {
        await syncProductStatusFromStripe(pbProductId, false);
        console.log(`✅ PB product ${pbProductId} marked as out_of_stock due to Stripe deletion.`);
    } catch (e) {
        console.error('Error handling product deletion:', e);
    }
}

// =============================================================================
// n8n Integration - Hybrid Automation
// =============================================================================

/**
 * Trigger n8n webhook for order post-processing (email, notifications, etc.)
 * This is a "fire and forget" call - we don't wait for or depend on its success.
 */
async function triggerN8nOrderNotification(order: Order): Promise<void> {
    if (!n8nWebhookUrl) {
        console.warn('⚠️ N8N_WEBHOOK_URL not configured. Skipping n8n notification.');
        return;
    }

    const payload = {
        event: 'order.created',
        timestamp: new Date().toISOString(),
        data: {
            order_id: order.id,
            order_number: `#${order.id.slice(-6).toUpperCase()}`,
            customer: {
                name: order.customerName || 'Guest',
                email: order.customerEmail
            },
            items: order.items.map(item => ({
                name: item.title,
                variant: [item.color, item.size].filter(Boolean).join(' / ') || undefined,
                quantity: item.quantity,
                price: item.price,
                image: item.image
            })),
            totals: {
                subtotal: order.amountSubtotal,
                shipping: order.amountShipping,
                total: order.amountTotal,
                currency: order.currency
            },
            shipping_address: order.shippingAddress
        }
    };

    try {
        // Fire and forget - don't block the main flow
        fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(res => {
            if (res.ok) {
                console.log(`✅ n8n webhook triggered for order ${order.id}`);
            } else {
                console.warn(`⚠️ n8n webhook responded with status ${res.status}`);
            }
        }).catch(err => {
            console.error('❌ Failed to trigger n8n webhook:', err.message);
        });
    } catch (e: any) {
        // Don't throw - this is a non-critical side effect
        console.error('❌ Error triggering n8n webhook:', e.message);
    }
}

