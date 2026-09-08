import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserOrders } from '$domains/order/server';

export const load: PageServerLoad = async ({ locals }) => {
	// 1. Auth Check
	if (!locals.user) {
		throw redirect(303, '/auth/login?redirectTo=/account/orders');
	}

	// 2. Fetch Orders
	const orderSummaries = await getUserOrders(locals.pb, locals.user.id);

	return {
		orders: orderSummaries,
		user: locals.user
	};
};
