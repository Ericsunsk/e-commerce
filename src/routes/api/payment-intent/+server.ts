import { stripe } from '$lib/server/stripe';
import { getProductByPbId } from '$lib/server/products';
import { validateAndApplyCoupon } from '$lib/server/coupons';
import { STRIPE } from '$lib/constants';
import type { RequestHandler } from './$types';
import type Stripe from 'stripe';
import { apiHandler } from '$lib/server/api-handler';
import type { ShippingAddress, CartItem } from '$lib/types';

/**
 * Helper: Find or create a Stripe Customer
 */
async function getOrCreateStripeCustomer(email: string, name: string, address: ShippingAddress) {
	if (!email) return null;

	try {
		// 1. Search for existing customer by email
		const existingCustomers = await stripe.customers.search({
			query: `email:'${email}'`,
			limit: 1
		});

		const addressParam = address
			? {
					line1: address.line1,
					line2: address.line2 || '',
					city: address.city,
					state: address.state,
					postal_code: address.postalCode,
					country: address.country
				}
			: undefined;

		if (existingCustomers.data.length > 0) {
			const customer = existingCustomers.data[0];
			// Update address if provided (to ensure tax calculation is accurate)
			if (addressParam) {
				await stripe.customers.update(customer.id, {
					name: name,
					address: addressParam,
					shipping: {
						name: name,
						address: addressParam
					}
				});
			}
			return customer.id;
		}

		// 2. Create new customer
		const newCustomer = await stripe.customers.create({
			email: email,
			name: name,
			address: addressParam,
			shipping: addressParam
				? {
						name: name,
						address: addressParam
					}
				: undefined
		});
		return newCustomer.id;
	} catch (e) {
		console.error('Failed to get/create Stripe customer:', e);
		return null;
	}
}

/**
 * Helper: Calculate tax using Stripe Tax API
 */
async function calculateTax(
	items: Array<{ id: string; title: string; quantity: number; priceCents: number }>,
	shippingAddress: ShippingAddress,
	currency: string
): Promise<{ taxAmountCents: number; calculationId: string | null }> {
	if (!shippingAddress || !shippingAddress.country) {
		return { taxAmountCents: 0, calculationId: null };
	}

	try {
		const lineItems = items.map((item) => ({
			amount: item.priceCents * item.quantity,
			quantity: item.quantity,
			reference: item.id,
			tax_behavior: 'exclusive' as const,
			tax_code: 'txcd_99999999'
		}));

		const taxCalculation = await stripe.tax.calculations.create({
			currency: currency.toLowerCase(),
			line_items: lineItems,
			customer_details: {
				address: {
					line1: shippingAddress.line1 || '',
					line2: shippingAddress.line2 || '',
					city: shippingAddress.city || '',
					state: shippingAddress.state || '',
					postal_code: shippingAddress.postalCode || '',
					country: shippingAddress.country || 'US'
				},
				address_source: 'shipping'
			}
		});

		return {
			taxAmountCents: taxCalculation.tax_amount_exclusive || 0,
			calculationId: taxCalculation.id
		};
	} catch (e: unknown) {
		console.error('Tax calculation failed:', e instanceof Error ? e.message : String(e));
		return { taxAmountCents: 0, calculationId: null };
	}
}

export const POST: RequestHandler = apiHandler(async ({ request }) => {
	const { items, couponCode, shippingInfo, customerInfo } = await request.json();

	if (!items || !Array.isArray(items) || items.length === 0) {
		throw { status: 400, message: 'Invalid items' };
	}

	// Calculate total amount on the server side (in cents)
	// SECURITY: Fetch price from DB instead of trusting client
	let amount = 0;
	const itemsWithPrice: Array<{ id: string; title: string; quantity: number; priceCents: number }> =
		[];

	for (const item of items) {
		const product = await getProductByPbId(item.id);
		if (!product) {
			throw {
				status: 400,
				message: `Item not available: ${item.title || item.id}. Please remove it from your cart.`
			};
		}

		if (product.stockStatus === 'out_of_stock') {
			throw {
				status: 400,
				message: `Item out of stock: ${item.title}. Please remove it from your cart.`
			};
		}

		const priceCents = Math.round(product.priceValue * 100);
		amount += priceCents * item.quantity;

		itemsWithPrice.push({
			id: item.id,
			title: item.title,
			quantity: item.quantity,
			priceCents
		});
	}

	const subtotal = amount;

	// Apply Coupon Logic
	if (couponCode) {
		const couponResult = await validateAndApplyCoupon(couponCode, amount);
		if (couponResult.valid && couponResult.discountCents > 0) {
			amount = Math.max(STRIPE.MIN_CHARGE_CENTS, amount - couponResult.discountCents);
		}
	}

	if (amount < STRIPE.MIN_CHARGE_CENTS) {
		throw { status: 400, message: 'Amount too small' };
	}

	const currency = customerInfo?.currency || 'usd';
	if (!STRIPE.SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
		throw { status: 400, message: 'Unsupported currency' };
	}

	// --- Step 1: Resolve Customer ---
	let customerId: string | null = null;
	if (customerInfo?.email && shippingInfo) {
		customerId = await getOrCreateStripeCustomer(
			customerInfo.email,
			customerInfo.name || 'Guest',
			shippingInfo
		);
	}

	// --- Step 2: Calculate Tax ---
	let taxAmountCents = 0;
	let taxCalculationId: string | null = null;

	if (shippingInfo) {
		console.log('[PaymentIntent] Calculating tax for address:', shippingInfo);
		const taxResult = await calculateTax(itemsWithPrice, shippingInfo, currency);
		taxAmountCents = taxResult.taxAmountCents;
		taxCalculationId = taxResult.calculationId;
	}

	const totalAmount = amount + taxAmountCents;

	// --- Step 3: Build order data for n8n webhook ---
	// Store complete order info in metadata so n8n can create the order
	const orderData = {
		user_id: customerInfo?.userId || '',
		customer_email: customerInfo?.email || '',
		customer_name: customerInfo?.name || 'Guest',
		items: items.map((i: CartItem) => ({
			id: i.id,
			title: i.title || 'Unknown Product',
			price: i.price,
			quantity: i.quantity,
			color: i.color || 'Standard',
			size: i.size || 'Generic',
			image: i.image || ''
		})),
		amount_subtotal: subtotal,
		amount_shipping: 0,
		amount_tax: taxAmountCents,
		amount_total: totalAmount,
		currency: currency.toLowerCase(),
		shipping_address: shippingInfo || {},
		coupon_code: couponCode || ''
	};

	// --- Step 4: Create PaymentIntent ---
	// NOTE: Order creation is handled by n8n webhook on payment_intent.succeeded
	const params: Stripe.PaymentIntentCreateParams = {
		amount: totalAmount,
		currency: currency.toLowerCase(),
		automatic_payment_methods: {
			enabled: true
		},
		metadata: {
			// Summary for Stripe Dashboard
			items_summary: items
				.map((i: CartItem) => `${i.quantity}x ${i.title}`)
				.join(', ')
				.substring(0, 500),
			// Full order data for n8n (JSON encoded)
			order_data: JSON.stringify(orderData),
			// Individual fields for easy n8n access
			user_id: customerInfo?.userId || '',
			coupon_code: couponCode || '',
			tax_calculation_id: taxCalculationId || ''
		}
	};

	if (customerId) {
		params.customer = customerId;
	}

	if (taxCalculationId) {
		(params as Stripe.PaymentIntentCreateParams & { hooks?: unknown }).hooks = {
			inputs: {
				tax: {
					calculation: taxCalculationId
				}
			}
		};
	}

	console.log('[PaymentIntent] Creating intent (order will be created by n8n webhook)');
	const paymentIntent = await stripe.paymentIntents.create(params);

	return {
		clientSecret: paymentIntent.client_secret,
		taxAmount: taxAmountCents,
		totalAmount: totalAmount
	};
});
