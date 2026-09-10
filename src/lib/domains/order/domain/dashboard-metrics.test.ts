import { describe, it, expect } from 'vitest';
import { computeDashboardMetrics } from './dashboard-metrics';

const orders = [
	{
		id: 'o1',
		status: 'paid',
		amountTotal: 5000,
		currency: 'usd',
		customerEmail: 'a@x.com',
		date: '2026-09-01'
	},
	{
		id: 'o2',
		status: 'shipped',
		amountTotal: 3000,
		currency: 'usd',
		customerEmail: 'b@x.com',
		date: '2026-09-03'
	},
	{
		id: 'o3',
		status: 'paid',
		amountTotal: 2000,
		currency: 'usd',
		customerEmail: 'c@x.com',
		date: '2026-09-02'
	},
	{
		id: 'o4',
		status: 'refunded',
		amountTotal: 1000,
		currency: 'usd',
		customerEmail: 'd@x.com',
		date: '2026-09-04'
	}
];

const variants = [
	{ id: 'v1', productId: 'p1', sku: 'A', color: 'Red', size: 'M', stockQuantity: 2 },
	{ id: 'v2', productId: 'p1', sku: 'B', color: 'Blue', size: 'L', stockQuantity: 50 },
	{ id: 'v3', productId: 'p2', sku: 'C', color: '', size: '', stockQuantity: 5 }
];

describe('dashboard metrics', () => {
	it('sums gmv, counts paid shipments, and flags low stock', () => {
		const metrics = computeDashboardMetrics(orders, variants, { p1: 'Tee', p2: 'Cap' });
		expect(metrics.gmvCents).toBe(11000);
		expect(metrics.currency).toBe('usd');
		expect(metrics.pendingShipments).toBe(2);
		expect(metrics.lowStockCount).toBe(2);
		expect(metrics.lowStock.map((row) => row.variantId)).toEqual(['v1', 'v3']);
		expect(metrics.lowStock[0]).toMatchObject({ productTitle: 'Tee', detail: 'Red / M' });
	});

	it('returns the 5 most recent orders first', () => {
		const metrics = computeDashboardMetrics(orders, [], {});
		expect(metrics.recentOrders.map((row) => row.id)).toEqual(['o4', 'o2', 'o3', 'o1']);
		expect(metrics.recentOrders[0]).toMatchObject({ email: 'd@x.com', total: 1000 });
	});

	it('handles empty batches without NaN', () => {
		const metrics = computeDashboardMetrics([], [], new Map());
		expect(metrics).toMatchObject({
			gmvCents: 0,
			currency: 'usd',
			pendingShipments: 0,
			lowStockCount: 0
		});
		expect(metrics.recentOrders).toEqual([]);
		expect(metrics.revenueTrend).toHaveLength(14);
		expect(metrics.ordersByStatus).toEqual([]);
	});

	it('buckets daily revenue over the trailing window with zero fill', () => {
		const now = new Date('2026-09-10T12:00:00').getTime();
		const metrics = computeDashboardMetrics(
			[
				{
					id: 'o1',
					status: 'paid',
					amountTotal: 5000,
					currency: 'usd',
					customerEmail: 'a',
					date: '2026-09-10T08:00:00'
				},
				{
					id: 'o2',
					status: 'paid',
					amountTotal: 2500,
					currency: 'usd',
					customerEmail: 'b',
					date: '2026-09-10T09:00:00'
				},
				{
					id: 'o3',
					status: 'shipped',
					amountTotal: 1000,
					currency: 'usd',
					customerEmail: 'c',
					date: '2026-09-08T08:00:00'
				}
			],
			[],
			{},
			now
		);
		expect(metrics.revenueTrend).toHaveLength(14);
		expect(metrics.revenueTrend[13]).toEqual({ date: '09-10', revenue: 75 });
		expect(metrics.revenueTrend[11]).toEqual({ date: '09-08', revenue: 10 });
		expect(metrics.revenueTrend[0]).toEqual({ date: '08-28', revenue: 0 });
	});

	it('groups order counts by status with chinese labels', () => {
		const metrics = computeDashboardMetrics(orders, [], {});
		expect(metrics.ordersByStatus).toEqual([
			{ key: 'paid', label: '已付款', value: 2 },
			{ key: 'shipped', label: '已发货', value: 1 },
			{ key: 'refunded', label: '已退款', value: 1 }
		]);
	});

	it('computes multi-window range summaries with sparklines and AOV', () => {
		const now = new Date('2026-09-10T12:00:00').getTime();
		const metrics = computeDashboardMetrics(orders, [], {}, now);
		expect(metrics.totalOrdersCount).toBe(4);
		expect(metrics.totalCustomersCount).toBe(4);
		expect(metrics.overallAovCents).toBe(2750);
		expect(metrics.ranges.today.trend).toHaveLength(12);
		expect(metrics.ranges['7d'].trend).toHaveLength(7);
		expect(metrics.ranges['30d'].trend).toHaveLength(30);
		expect(metrics.ranges['7d'].sparkline).toHaveLength(7);
	});
});
