import type { PageServerLoad } from './$types';
import { getDashboardMetrics } from '$domains/order/server';
import type { TimeRangeKey, RangeSummary } from '$domains/order';
import { formatCurrency } from '$shared/kernel';

export const load: PageServerLoad = async () => {
	const metrics = await getDashboardMetrics();
	const fmt = (cents: number) =>
		formatCurrency(cents, { currency: metrics.currency, isCents: true });

	const formattedRanges = {
		today: {
			...metrics.ranges.today,
			gmvFormatted: fmt(metrics.ranges.today.gmvCents),
			aovFormatted: fmt(metrics.ranges.today.aovCents)
		},
		'7d': {
			...metrics.ranges['7d'],
			gmvFormatted: fmt(metrics.ranges['7d'].gmvCents),
			aovFormatted: fmt(metrics.ranges['7d'].aovCents)
		},
		'30d': {
			...metrics.ranges['30d'],
			gmvFormatted: fmt(metrics.ranges['30d'].gmvCents),
			aovFormatted: fmt(metrics.ranges['30d'].aovCents)
		},
		all: {
			...metrics.ranges.all,
			gmvFormatted: fmt(metrics.ranges.all.gmvCents),
			aovFormatted: fmt(metrics.ranges.all.aovCents)
		}
	} satisfies Record<TimeRangeKey, RangeSummary & { gmvFormatted: string; aovFormatted: string }>;

	return {
		gmv: fmt(metrics.gmvCents),
		pendingShipments: metrics.pendingShipments,
		lowStockCount: metrics.lowStockCount,
		lowStock: metrics.lowStock,
		recentOrders: metrics.recentOrders.map((order) => ({
			...order,
			totalFormatted: fmt(order.total)
		})),
		revenueTrend: metrics.revenueTrend,
		ordersByStatus: metrics.ordersByStatus,
		currency: metrics.currency,
		ranges: formattedRanges,
		totalOrdersCount: metrics.totalOrdersCount,
		totalCustomersCount: metrics.totalCustomersCount,
		overallAov: fmt(metrics.overallAovCents),
		topProducts: metrics.topProducts.map((p) => ({
			...p,
			revenueFormatted: fmt(p.revenueCents)
		})),
		catalogHealth: metrics.catalogHealth,
		customerInsights: {
			...metrics.customerInsights,
			repeatRevenueFormatted: fmt(metrics.customerInsights.repeatRevenueCents)
		}
	};
};
