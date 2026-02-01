import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrderById } from '$lib/server/orders';
import type { OrderDetail } from '$lib/types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// 1. Auth Check
	if (!locals.user) {
		throw redirect(303, `/auth/login?redirectTo=/account/orders/${params.id}`);
	}

	// 2. Fetch Order
	const order = await getOrderById(params.id, locals.user.id);

	if (!order) {
		throw error(404, 'Order not found');
	}

	// 3. Map to View Model (OrderDetail)
	const orderDetail: OrderDetail = {
		id: order.id,
		date: order.created,
		status: order.status,
		total: order.amountTotal,
		currency: order.currency,
		itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
		firstItemTitle: order.items[0]?.title,

		// Detail specific fields
		items: order.items.map((item) => ({
			id: item.id,
			title: item.title,
			price: item.price,
			quantity: item.quantity,
			image: item.image,
			variant: [item.color, item.size].filter(Boolean).join(' / ') || undefined
		})),
		shippingAddress: order.shippingAddress,
		tracking: order.trackingNumber
			? {
					number: order.trackingNumber,
					carrier: order.trackingCarrier || 'Unknown'
				}
			: undefined
	};

	return {
		order: orderDetail
	};
};
