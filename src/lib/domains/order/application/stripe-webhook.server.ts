/**
 * Stripe webhook pipeline (server-only).
 *
 * Verifies `stripe-signature` against the dynamic webhook secret, then
 * dispatches: `succeeded` runs the idempotent fulfillment flow,
 * `payment_failed` is logged, and `charge.refunded` syncs the order state.
 */
import { Collections, type TypedPocketBase } from '$shared/infrastructure';
import { withAdmin, withKeyedLock, getErrorStatus } from '$shared/infrastructure/server';
import { getStripeClient, getPaymentConfig } from '$domains/payment/server';
import { allocateInventory } from '$domains/catalog/domain/inventory-allocation';
import { buildPocketBaseInventoryClient } from '$domains/catalog/infrastructure/inventory-deduction.server';
import { incrementCouponUsageByCodeWithClient } from '$domains/checkout/infrastructure/coupon-repository.server';
import {
	findOrderByPaymentIntentId,
	createOrderRecord
} from '../infrastructure/order-reconciliation.server';
import {
	recordRefundWithClient,
	updateOrderStatusWithClient
} from '../infrastructure/order-repository.server';
import {
	classifyStripeEvent,
	fulfillSucceededPayment,
	mapChargeRefunded,
	type SucceededOutcome
} from '../domain/stripe-webhook';

export interface WebhookHandleResult {
	handled: boolean;
	outcome?: SucceededOutcome['outcome'] | 'failed-logged' | 'refund-synced' | 'ignored';
	orderId?: string | null;
}

/** Verify the raw-body signature; throws `{ status: 400|500 }` on failure. */
export async function verifyStripeWebhook(
	rawBody: string,
	signature: string | null
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	if (!signature) {
		throw { status: 400, message: 'Missing stripe-signature header' };
	}
	const { webhookSecret } = await getPaymentConfig();
	if (!webhookSecret) {
		throw { status: 500, message: 'Stripe webhook secret is not configured' };
	}
	try {
		const stripe = await getStripeClient();
		return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[webhook/stripe] signature verification failed:', message);
		throw { status: 400, message: 'Invalid webhook signature' };
	}
}

async function clearCartRecordWithClient(pb: TypedPocketBase, cartRecordId: string): Promise<void> {
	try {
		await pb.collection(Collections.UserLists).delete(cartRecordId);
	} catch (err: unknown) {
		if (getErrorStatus(err) !== 404) throw err;
	}
}

/** Dispatch a verified event to its fulfillment branch. */
export async function handleStripeWebhookEvent(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	event: any
): Promise<WebhookHandleResult> {
	const classified = classifyStripeEvent(event ?? {});
	const object = (event?.data?.object ?? {}) as Record<string, unknown>;

	switch (classified.kind) {
		case 'payment-succeeded': {
			const paymentIntentId = classified.paymentIntentId;
			if (!paymentIntentId) return { handled: false };
			const metadata = (object.metadata ?? {}) as Record<string, string>;
			const outcome = await withAdmin((pb) =>
				fulfillSucceededPayment(
					{
						orders: {
							findByPaymentIntentId: (id) => findOrderByPaymentIntentId(pb, id),
							createOrder: (data, id) => createOrderRecord(pb, data, id)
						},
						inventory: {
							deduct: async (orderId, items) => {
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
						coupons: {
							incrementUsage: (code) => incrementCouponUsageByCodeWithClient(pb, code)
						},
						orderStatus: {
							update: (orderId, status) => updateOrderStatusWithClient(pb, orderId, status)
						},
						carts: {
							clearCartRecord: (cartRecordId) => clearCartRecordWithClient(pb, cartRecordId)
						},
						lock: withKeyedLock
					},
					paymentIntentId,
					metadata
				)
			);
			return {
				handled: outcome.outcome === 'created',
				outcome: outcome.outcome,
				orderId: outcome.orderId
			};
		}

		case 'payment-failed': {
			const lastError = object.last_payment_error as { message?: string } | undefined;
			console.error(
				JSON.stringify({
					level: 'error',
					scope: 'webhook/stripe',
					event: 'payment_intent.payment_failed',
					paymentIntentId: classified.paymentIntentId,
					message: typeof lastError?.message === 'string' ? lastError.message : 'payment failed'
				})
			);
			return { handled: true, outcome: 'failed-logged', orderId: null };
		}

		case 'charge-refunded': {
			const sync = mapChargeRefunded(object);
			if (!sync) return { handled: false };
			const orderId = await withAdmin(async (pb) => {
				const found = await findOrderByPaymentIntentId(pb, sync.paymentIntentId);
				if (!found) return null;
				await recordRefundWithClient(pb, found, {
					refundId: sync.refundId,
					status: sync.status,
					amountCents: sync.amountCents,
					reason: 'Stripe charge.refunded'
				});
				return found;
			});
			return { handled: orderId !== null, outcome: 'refund-synced', orderId };
		}

		default:
			return { handled: false, outcome: 'ignored', orderId: null };
	}
}
