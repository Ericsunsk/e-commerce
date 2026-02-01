import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrdersByUser } from '$lib/server/orders';
import type { OrderSummary } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	// 1. Auth Check
	if (!locals.user) {
		throw redirect(303, '/auth/login?redirectTo=/account/orders');
	}

	// 2. Fetch Orders
	const orders = await getOrdersByUser(locals.user.id);

	// 3. Map to View Model (OrderSummary)
	const orderSummaries: OrderSummary[] = orders.map((order) => {
		const firstItem = order.items[0];
		return {
			id: order.id,
			date: order.created,
			status: order.status,
			total: order.amountTotal,
			currency: order.currency,
			itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
			firstItemTitle: firstItem ? firstItem.title : 'Unknown Item'
		};
	});

	return {
		orders: orderSummaries,
		user: locals.user
	};
};
