import { stripe } from '$lib/server/stripe';
import { createOrder } from '$lib/server/orders';
import { getProductByPbId } from '$lib/server/products';
import { validateAndApplyCoupon } from '$lib/server/coupons';
import { parsePrice } from '$lib/utils/price';
import { STRIPE } from '$lib/constants';
import { json } from '@sveltejs/kit';
// checkoutLimiter check removed as it's handled in hooks.server.ts
import type { RequestHandler } from './$types';
import type Stripe from 'stripe';
import { apiHandler } from '$lib/server/api-handler';

/**
 * Helper: Find or create a Stripe Customer
 */
async function getOrCreateStripeCustomer(email: string, name: string, address: any) {
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
 * Returns the tax calculation object with tax amount and calculation ID
 */
async function calculateTax(
	items: Array<{ id: string; title: string; quantity: number; priceCents: number }>,
	shippingAddress: any,
	currency: string
): Promise<{ taxAmountCents: number; calculationId: string | null }> {
	// If no shipping address, we can't calculate tax
	if (!shippingAddress || !shippingAddress.country) {
		return { taxAmountCents: 0, calculationId: null };
	}

	try {
		// Build line items for tax calculation
		const lineItems = items.map((item) => ({
			amount: item.priceCents * item.quantity,
			quantity: item.quantity,
			reference: item.id, // Product ID as reference
			tax_behavior: 'exclusive' as const, // Tax is added on top of the price
			tax_code: 'txcd_99999999' // General - Tangible Goods (default tax code)
		}));

		// Create tax calculation
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

		const taxAmountCents = taxCalculation.tax_amount_exclusive || 0;

		return {
			taxAmountCents,
			calculationId: taxCalculation.id
		};
	} catch (e: any) {
		console.error('Tax calculation failed:', e.message);
		// Return 0 tax if calculation fails - payment can still proceed
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
			console.error(`Product not found during checkout: ${item.id}`);
			// Return explicit error with item details
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

		// product.priceValue is in dollars (float), convert to cents
		const priceCents = Math.round(product.priceValue * 100);
		amount += priceCents * item.quantity;

		itemsWithPrice.push({
			id: item.id,
			title: item.title,
			quantity: item.quantity,
			priceCents
		});
	}

	const subtotal = amount; // Keep track of subtotal before discount

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

	// Validate currency
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

	// --- Step 2: Calculate Tax using Stripe Tax API ---
	let taxAmountCents = 0;
	let taxCalculationId: string | null = null;

	if (shippingInfo) {
		const taxResult = await calculateTax(itemsWithPrice, shippingInfo, currency);
		taxAmountCents = taxResult.taxAmountCents;
		taxCalculationId = taxResult.calculationId;
	}

	// Total amount = subtotal (after discount) + tax
	const totalAmount = amount + taxAmountCents;

	// --- Step 3: Create PaymentIntent ---
	const params: Stripe.PaymentIntentCreateParams = {
		amount: totalAmount,
		currency: currency.toLowerCase(),
		automatic_payment_methods: {
			enabled: true
		},
		metadata: {
			items_summary: items
				.map((i: any) => `${i.quantity}x ${i.title}`)
				.join(', ')
				.substring(0, 500),
			coupon_code: couponCode || '',
			tax_calculation_id: taxCalculationId || ''
		}
	};

	// Add customer if resolved
	if (customerId) {
		params.customer = customerId;
	}

	// Link tax calculation if available (using hooks.inputs.tax)
	if (taxCalculationId) {
		(params as any).hooks = {
			inputs: {
				tax: {
					calculation: taxCalculationId
				}
			}
		};
	}

	const paymentIntent = await stripe.paymentIntents.create(params);

	// Create Pending Order in PocketBase
	if (shippingInfo && customerInfo) {
		await createOrder({
			userId: customerInfo.userId || undefined,
			stripeSessionId: '',
			stripePaymentIntent: paymentIntent.id,
			customerEmail: customerInfo.email,
			customerName: customerInfo.name,
			items: items.map((i: any) => ({
				productId: i.id,
				variantId: i.variantId,
				title: i.title,
				price: parsePrice(i.price),
				quantity: i.quantity,
				color: i.color,
				size: i.size,
				image: i.image
			})),
			amountSubtotal: subtotal,
			amountShipping: 0,
			amountTax: taxAmountCents,
			amountTotal: totalAmount,
			currency: currency.toLowerCase(),
			status: 'pending',
			shippingAddress: shippingInfo,
			notes: couponCode ? `Coupon applied: ${couponCode}` : undefined
		});
	}

	return {
		clientSecret: paymentIntent.client_secret,
		taxAmount: taxAmountCents,
		totalAmount: totalAmount
	};
});
