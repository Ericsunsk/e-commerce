/**
 * Stripe webhook dispatch + fulfillment orchestration (pure domain).
 *
 * Maps raw Stripe events to actions and executes the `succeeded` pipeline
 * (idempotent order creation, inventory deduction, coupon increment, cart
 * clearing) under a per-payment-intent lock. All I/O crosses seams so the
 * whole flow is unit-testable without Stripe or PocketBase.
 */
import type { OrderStatus } from './models';
import {
	reassembleOrderData,
	type ReconciledOrderData,
	type ReconciledOrderItem
} from './order-reconciliation';

export type WebhookEventKind =
	| 'payment-succeeded'
	| 'payment-failed'
	| 'charge-refunded'
	| 'ignored';

export interface ClassifiedEvent {
	kind: WebhookEventKind;
	paymentIntentId: string | null;
}

/** Route a raw Stripe event to its handling kind (never throws). */
export function classifyStripeEvent(event: {
	type?: string;
	data?: { object?: Record<string, unknown> };
}): ClassifiedEvent {
	const type = typeof event?.type === 'string' ? event.type : '';
	const object = event?.data?.object ?? {};
	const paymentIntentId =
		typeof object.payment_intent === 'string'
			? object.payment_intent
			: typeof object.id === 'string' && type.startsWith('payment_intent.')
				? object.id
				: null;

	switch (type) {
		case 'payment_intent.succeeded':
			return { kind: 'payment-succeeded', paymentIntentId };
		case 'payment_intent.payment_failed':
			return { kind: 'payment-failed', paymentIntentId };
		case 'charge.refunded':
			return { kind: 'charge-refunded', paymentIntentId };
		default:
			return { kind: 'ignored', paymentIntentId };
	}
}

export interface SucceededPorts {
	orders: {
		findByPaymentIntentId(paymentIntentId: string): Promise<string | null>;
		createOrder(data: ReconciledOrderData, paymentIntentId: string): Promise<string>;
	};
	inventory: {
		deduct(orderId: string, items: ReconciledOrderItem[]): Promise<{ success: boolean }>;
	};
	coupons: {
		incrementUsage(couponCode: string): Promise<void>;
	};
	carts: {
		clearCartRecord(cartRecordId: string): Promise<void>;
	};
	orderStatus: {
		update(orderId: string, status: OrderStatus): Promise<void>;
	};
	lock: <T>(key: string, task: () => Promise<T>) => Promise<T>;
}

export type SucceededOutcome =
	| { outcome: 'already-exists'; orderId: string }
	| { outcome: 'missing-order-data'; orderId: null }
	| { outcome: 'created'; orderId: string; inventoryDeducted: boolean };

/**
 * Fulfill one succeeded payment: idempotent create + deduct inside the
 * lock, coupon/cart side effects exactly once (only on `created`).
 */
export async function fulfillSucceededPayment(
	ports: SucceededPorts,
	paymentIntentId: string,
	metadata: Record<string, string>
): Promise<SucceededOutcome> {
	return ports.lock(`order:${paymentIntentId}`, async () => {
		const existing = await ports.orders.findByPaymentIntentId(paymentIntentId);
		if (existing) return { outcome: 'already-exists', orderId: existing };

		const orderData = reassembleOrderData(metadata);
		if (!orderData) return { outcome: 'missing-order-data', orderId: null };

		const orderId = await ports.orders.createOrder(orderData, paymentIntentId);

		let deduction: { success: boolean };
		try {
			deduction = await ports.inventory.deduct(orderId, orderData.items);
		} catch (err) {
			// Inventory deduction failed infra-wise; the order cannot proceed to paid.
			await ports.orderStatus.update(orderId, 'cancelled');
			throw err;
		}

		if (deduction.success) {
			await ports.orderStatus.update(orderId, 'paid');

			if (orderData.coupon_code) {
				await ports.coupons.incrementUsage(orderData.coupon_code);
			}
			if (orderData.cart_record_id) {
				await ports.carts.clearCartRecord(orderData.cart_record_id);
			}
		} else {
			// Stock was insufficient; do not mark paid or touch coupon/cart side effects.
			await ports.orderStatus.update(orderId, 'cancelled');
		}

		return { outcome: 'created', orderId, inventoryDeducted: deduction.success };
	});
}

export interface RefundSync {
	paymentIntentId: string;
	refundId: string;
	status: 'refunded' | 'partially_refunded';
	amountCents: number | null;
}

/** Map a `charge.refunded` object to the order-side sync record (null when unusable). */
export function mapChargeRefunded(charge: Record<string, unknown>): RefundSync | null {
	const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
	if (!paymentIntentId) return null;

	const amount = Number(charge.amount);
	const refunded = Number(charge.amount_refunded);
	if (!Number.isFinite(amount) || amount <= 0) return null;

	const refunds = charge.refunds;
	const firstRefund =
		refunds && typeof refunds === 'object' && Array.isArray((refunds as { data?: unknown }).data)
			? ((refunds as { data: Array<{ id?: unknown }> }).data[0]?.id ?? null)
			: null;
	const refundId =
		typeof firstRefund === 'string'
			? firstRefund
			: typeof charge.id === 'string'
				? charge.id
				: 'unknown';

	return {
		paymentIntentId,
		refundId,
		status: Number.isFinite(refunded) && refunded < amount ? 'partially_refunded' : 'refunded',
		amountCents: Number.isFinite(refunded) ? refunded : null
	};
}
