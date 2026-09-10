import type { TypedPocketBase } from '$shared/infrastructure';
import { getOrdersByUserWithClient, getOrderById } from '../infrastructure/order-repository.server';
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
