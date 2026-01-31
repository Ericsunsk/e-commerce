import type { PageServerLoad } from './$types';
import { getOrdersByUser } from '$lib/server/orders';

export const load: PageServerLoad = async ({ locals }) => {
	// In a real implementation, we would get the user ID from the session
	// For now, we'll return empty data and let the client handle auth
	return {
		orders: []
	};
};
