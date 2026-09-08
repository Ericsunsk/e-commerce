import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

export interface ShippingAddressData {
	name?: string;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postalCode: string;
	country: string;
}

const secretKey = env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_dev_mode';

export const stripe = new Stripe(secretKey, {
	apiVersion: '2025-02-24.acacia',
	typescript: true
});

export const isStripeConfigured =
	!!env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.includes('placeholder');

export async function getOrCreateStripeCustomer(
	email: string,
	name: string,
	address: ShippingAddressData
): Promise<string | null> {
	if (!email) return null;

	try {
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
			if (addressParam) {
				await stripe.customers.update(customer.id, {
					name,
					address: addressParam,
					shipping: {
						name,
						address: addressParam
					}
				});
			}
			return customer.id;
		}

		const newCustomer = await stripe.customers.create({
			email,
			name,
			address: addressParam,
			shipping: addressParam
				? {
						name,
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

export async function calculateStripeTax(
	items: Array<{ id: string; title: string; quantity: number; priceCents: number }>,
	shippingAddress: ShippingAddressData,
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
