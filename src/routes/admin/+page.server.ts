import type { PageServerLoad } from './$types';
import { getDashboardMetrics } from '$domains/order/server';
import { formatCurrency } from '$shared/kernel';

export const load: PageServerLoad = async () => {
	const metrics = await getDashboardMetrics();
	return {
		gmv: formatCurrency(metrics.gmvCents, { currency: metrics.currency, isCents: true }),
		pendingShipments: metrics.pendingShipments,
		lowStockCount: metrics.lowStockCount,
		lowStock: metrics.lowStock,
		recentOrders: metrics.recentOrders.map((order) => ({
			...order,
			totalFormatted: formatCurrency(order.total, { currency: order.currency, isCents: true })
		}))
	};
};
