import type { TypedPocketBase } from '$shared/infrastructure';
import { withAdmin } from '$shared/infrastructure/server';
import {
	getOrdersByUserWithClient,
	getOrderById,
	listAllOrdersWithClient,
	getAdminOrderByIdWithClient,
	fulfillOrderWithClient,
	recordRefundWithClient,
	type AdminOrderStatusFilter
} from '../infrastructure/order-repository.server';
import { emitOrderShipped, type FulfillPayload } from '../domain/order-fulfillment';
import {
	normalizeRefundBody,
	resolveRefundStatus,
	type RefundRequest
} from '../domain/order-refunds';
import { getStripeClient } from '$domains/payment/server';
import type { Order, OrderSummary } from '../domain/models';

export async function getUserOrders(
	pb: TypedPocketBase,
	userId: string,
	email?: string | null
): Promise<OrderSummary[]> {
	const orders = await getOrdersByUserWithClient(pb, userId, email);

	return orders.map((order) => {
		const firstItem = order.items[0];
		const date = order.placed_at_override || order.placed_at || '';
		return {
			id: order.id,
			date,
			status: order.status,
			total: order.amountTotal,
			currency: order.currency,
			itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
			firstItemTitle: firstItem ? firstItem.title : 'Unknown Item'
		};
	});
}

export async function getUserOrderById(
	orderId: string,
	userId: string,
	email?: string | null
): Promise<Order | null> {
	return getOrderById(orderId, userId, email);
}

export async function listAdminOrders(status: AdminOrderStatusFilter = 'all'): Promise<Order[]> {
	return withAdmin((pb) => listAllOrdersWithClient(pb, status));
}

export async function getAdminOrderById(orderId: string): Promise<Order | null> {
	return withAdmin((pb) => getAdminOrderByIdWithClient(pb, orderId));
}

/** Admin: ship an order, then fan out the shipment notification. */
export async function fulfillAdminOrder(orderId: string, payload: FulfillPayload): Promise<Order> {
	const order = await withAdmin((pb) => fulfillOrderWithClient(pb, orderId, payload));
	await emitOrderShipped({
		orderId: order.id,
		carrier: payload.carrier,
		trackingNumber: payload.trackingNumber,
		customerEmail: order.customerEmail,
		shippedAt: new Date().toISOString()
	});
	return order;
}

export interface AdminRefundResult {
	order: Order;
	refundId: string;
	status: 'refunded' | 'partially_refunded';
	amountCents: number | null;
}

/**
 * Admin: issue a Stripe refund against the order's payment intent and record
 * the outcome. Stripe errors propagate untouched for the route to map.
 */
export async function refundAdminOrder(orderId: string, body: unknown): Promise<AdminRefundResult> {
	return withAdmin(async (pb) => {
		const current = await getAdminOrderByIdWithClient(pb, orderId);
		if (!current) {
			throw { status: 404, message: '订单不存在' };
		}
		if (!current.stripePaymentIntent) {
			throw { status: 409, message: '该订单没有可退款的 Stripe 支付' };
		}

		const request: RefundRequest = normalizeRefundBody(body, current.amountTotal);
		const stripe = await getStripeClient();
		const refund = await stripe.refunds.create({
			payment_intent: current.stripePaymentIntent,
			...(request.amountCents != null ? { amount: request.amountCents } : {}),
			...(request.reason ? { metadata: { reason: request.reason } } : {})
		});

		const status = resolveRefundStatus(request, current.amountTotal);
		const order = await recordRefundWithClient(pb, orderId, {
			refundId: refund.id,
			status,
			amountCents: request.amountCents,
			reason: request.reason
		});
		return { order, refundId: refund.id, status, amountCents: request.amountCents };
	});
}
