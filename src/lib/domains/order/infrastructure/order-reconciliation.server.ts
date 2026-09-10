/**
 * Order Reconciliation (Server adapter).
 *
 * Wires the pure `reconcileOrder` domain module to Stripe verification,
 * PocketBase order persistence, and catalog inventory deduction.
 */

import { Collections, type TypedPocketBase } from '$shared/infrastructure';
import { withAdmin, withKeyedLock, getErrorStatus, buildPocketBaseFilter } from '$shared/infrastructure/server';
import { getStripeClient } from '$domains/payment/server';
import { allocateInventory } from '$domains/catalog/domain/inventory-allocation';
import { buildPocketBaseInventoryClient } from '$domains/catalog/infrastructure/inventory-deduction.server';
import {
	reconcileOrder,
	type ReconciledOrderData,
	type ReconciliationOutcome
} from '../domain/order-reconciliation';

import { updateOrderStatusWithClient } from '../infrastructure/order-repository.server';

/** Find an order id by Stripe payment intent (shared with the webhook pipeline). */
export async function findOrderByPaymentIntentId(
	pb: TypedPocketBase,
	paymentIntentId: string
): Promise<string | null> {
	try {
		const filter = buildPocketBaseFilter(pb, 'stripe_payment_intent = {:paymentIntentId}', {
			paymentIntentId
		});
		const record = await pb.collection(Collections.Orders).getFirstListItem(filter, {
			fields: 'id'
		});
		return record.id;
	} catch (err: unknown) {
		if (getErrorStatus(err) === 404) return null;
		throw err;
	}
}

/** Persist an order + item rows from intake metadata (shared with webhooks). */
export async function createOrderRecord(
	pb: TypedPocketBase,
	data: ReconciledOrderData,
	paymentIntentId: string
): Promise<string> {
	const order = await pb.collection(Collections.Orders).create({
		user: data.user_id || undefined,
		stripe_payment_intent: paymentIntentId,
		customer_email: data.customer_email,
		customer_name: data.customer_name,
		items: data.items,
		amount_subtotal: data.amount_subtotal,
		amount_shipping: data.amount_shipping,
		amount_tax: data.amount_tax,
		amount_total: data.amount_total,
		currency: data.currency,
		shipping_address: data.shipping_address,
		status: 'processing',
		placed_at_override: data.placed_at_override
	});

	// Order-item rows are a read-model convenience; a row failure must not
	// fail reconciliation since the snapshot above is authoritative.
	for (const item of data.items) {
		try {
			await pb.collection(Collections.OrderItems).create({
				order_id: order.id,
				product_id: item.productId,
				variant_id: item.variantId || undefined,
				product_title_snap: item.title,
				price_snap: item.price,
				quantity: item.quantity,
				image_snap: item.image,
				sku_snap: item.skuSnap,
				variant_snap_json: { color: item.color, size: item.size }
			});
		} catch (err: unknown) {
			console.error(
				'[reconcile] order-item row failed:',
				err instanceof Error ? err.message : String(err)
			);
		}
	}

	return order.id;
}

/** Route/page seam: verify + idempotently record the order for a payment intent. */
export async function reconcileCheckoutOrder(
	paymentIntentId: string
): Promise<ReconciliationOutcome> {
	return withAdmin(async (pb) => {
		return reconcileOrder(
			{
				payments: {
					retrievePaymentIntent: async (id: string) => {
						const stripe = await getStripeClient();
						const intent = await stripe.paymentIntents.retrieve(id);
						return {
							id: intent.id,
							status: intent.status,
							metadata: (intent.metadata ?? {}) as Record<string, string>
						};
					}
				},
				orders: {
					findByPaymentIntentId: (id: string) => findOrderByPaymentIntentId(pb, id),
					createOrder: (data: ReconciledOrderData, id: string) => createOrderRecord(pb, data, id)
				},
				orderStatus: {
					update: (orderId: string, status: 'paid' | 'cancelled') =>
						updateOrderStatusWithClient(pb, orderId, status)
				},
				inventory: {
					deduct: async (orderId: string, items: ReconciledOrderData['items']) => {
						const result = await allocateInventory(
							buildPocketBaseInventoryClient(pb),
							withKeyedLock,
							{
								orderId,
								items: items.map((item) => ({
									productId: item.productId,
									variantId: item.variantId,
									quantity: item.quantity
								}))
							}
						);
						return { success: result.success };
					}
				},
				lock: withKeyedLock
			},
			paymentIntentId
		);
	});
}
