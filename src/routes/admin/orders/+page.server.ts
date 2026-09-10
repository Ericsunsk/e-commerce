import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listAdminOrders } from '$domains/order/server';
import type { AdminOrderStatusFilter } from '$domains/order/server';

const TABS = ['all', 'unfulfilled', 'shipped', 'delivered', 'refunded'] as const;

export const load: PageServerLoad = async ({ url }) => {
	const raw = url.searchParams.get('status') ?? 'all';
	const status: AdminOrderStatusFilter = (
		TABS as readonly string[]
	).includes(raw)
		? (raw as AdminOrderStatusFilter)
		: 'all';

	try {
		const orders = await listAdminOrders(status);
		return {
			status,
			orders: orders.map((order) => ({
				id: order.id,
				date: order.placed_at_override || order.placed_at || '',
				status: order.status,
				total: order.amountTotal,
				currency: order.currency,
				email: order.customerEmail,
				itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0)
			}))
		};
	} catch {
		throw error(500, 'Failed to load orders');
	}
};
