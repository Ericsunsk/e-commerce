import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminOrderById } from '$domains/order/server';

export const load: PageServerLoad = async ({ params }) => {
	const order = await getAdminOrderById(params.id);
	if (!order) {
		throw error(404, 'Order not found');
	}
	return {
		order: {
			id: order.id,
			date: order.placed_at_override || order.placed_at || '',
			status: order.status,
			total: order.amountTotal,
			subtotal: order.amountSubtotal,
			shipping: order.amountShipping,
			tax: order.amountTax,
			currency: order.currency,
			email: order.customerEmail,
			name: order.customerName,
			address: order.shippingAddress,
			trackingNumber: order.trackingNumber,
			trackingCarrier: order.trackingCarrier,
			items: order.items.map((item) => ({
				id: item.id,
				title: item.title,
				price: item.price,
				quantity: item.quantity,
				image: item.image,
				variant: [item.color, item.size].filter(Boolean).join(' / ') || undefined
			}))
		}
	};
};
