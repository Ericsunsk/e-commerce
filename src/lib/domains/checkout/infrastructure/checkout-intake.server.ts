/**
 * Checkout Intake (Server adapter).
 *
 * Thin seam between the HTTP route and the deep `createCheckoutSession`
 * domain module: parses the body, then wires Catalog / Discount / Stripe /
 * Customer ports to their PocketBase + Stripe implementations.
 */

import { Collections } from '$shared/infrastructure';
import { parseAndNormalizeJsonBody, withAdmin, buildPocketBaseFilter } from '$shared/infrastructure/server';
import {
	resolveCheckoutProductWithClient,
	STRIPE_TEST_FALLBACK_PRICE_VALUE
} from '$domains/catalog/server';
import { validateAndApplyCouponWithClient } from './coupon-repository.server';
import { getOrCreateStripeCustomer, calculateStripeTax } from './stripe.server';
import { getStripeClient } from '$domains/payment/server';
import {
	createCheckoutSession,
	normalizeIntakeRequest,
	type IntakePorts
} from '../domain/checkout-intake';

/** Route seam: parse, authorize-free intake, delegate to the deep module. */
export async function handlePaymentIntentRequest(request: Request) {
	const intake = await parseAndNormalizeJsonBody(request, normalizeIntakeRequest);

	return withAdmin(async (pb) => {
		const ports: IntakePorts = {
			catalog: {
				isDev: import.meta.env.DEV,
				devFallbackUnitPrice: STRIPE_TEST_FALLBACK_PRICE_VALUE,
				resolveProduct: async (itemId: string) => {
					const resolved = await resolveCheckoutProductWithClient(pb, itemId);
					if (!resolved) return null;
					const { product, recordId } = resolved;
					return {
						recordId,
						product: {
							title: product.title,
							priceValue: product.priceValue,
							image: product.image,
							hasVariants: product.hasVariants,
							stockStatus: product.stockStatus,
							variants: product.variants?.map((v) => ({
								id: v.id,
								sku: v.sku,
								color: v.color,
								size: v.size,
								image: v.image,
								stockQuantity: v.stockQuantity,
								// Carried through so checkout charges the variant's own
								// price instead of silently falling back to the
								// product-level one.
								price: v.price
							}))
						}
					};
				}
			},
			discount: {
				applyCoupon: (code, amountCents) => validateAndApplyCouponWithClient(pb, code, amountCents)
			},
			stripe: {
				getOrCreateCustomer: (email, name, address) =>
					getOrCreateStripeCustomer(email, name, {
						line1: address.line1,
						line2: address.line2,
						city: address.city,
						state: address.state,
						postalCode: address.postalCode,
						country: address.country
					}),
				calculateTax: (lines, address, currency) =>
					calculateStripeTax(
						lines,
						{
							line1: address.line1,
							line2: address.line2,
							city: address.city,
							state: address.state,
							postalCode: address.postalCode,
							country: address.country
						},
						currency
					),
				createPaymentIntent: async ({ amount, currency, customerId, metadata }) => {
					const stripe = await getStripeClient();
					const paymentIntent = await stripe.paymentIntents.create({
						amount,
						currency,
						automatic_payment_methods: { enabled: true },
						metadata,
						...(customerId ? { customer: customerId } : {})
					});
					return { clientSecret: paymentIntent.client_secret };
				}
			},
			customer: {
				findStoredCustomerId: async (userId: string) => {
					try {
						const userRecord = await pb.collection(Collections.Users).getOne(userId);
						const existing = (userRecord as unknown as { stripe_customer_id?: string })
							.stripe_customer_id;
						return typeof existing === 'string' && existing.length > 0 ? existing : null;
					} catch {
						return null;
					}
				},
				persistCustomerId: async (userId: string, customerId: string) => {
					try {
						await pb.collection(Collections.Users).update(userId, {
							stripe_customer_id: customerId
						});
					} catch {
						// Non-fatal: continue checkout even if we can't store it.
					}
				},
				findCartRecordId: async (userId: string) => {
					try {
						const filter = buildPocketBaseFilter(pb, 'user = {:userId} && type = {:type}', {
							userId,
							type: 'cart'
						});
						const cart = await pb.collection(Collections.UserLists).getFirstListItem(filter, {
							fields: 'id'
						});
						return cart.id;
					} catch {
						return '';
					}
				}
			}
		};

		return createCheckoutSession(ports, intake);
	});
}
