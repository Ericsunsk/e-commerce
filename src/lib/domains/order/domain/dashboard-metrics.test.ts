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

	it('computes topProducts, catalogHealth, and customerInsights', () => {
		const ordersWithItems = [
			{
				id: 'o1',
				status: 'paid',
				amountTotal: 10000,
				currency: 'usd',
				customerEmail: 'alice@x.com',
				date: '2026-09-01',
				items: [
					{ productId: 'p1', title: 'Tee', price: 3000, quantity: 2 },
					{ productId: 'p2', title: 'Cap', price: 4000, quantity: 1 }
				]
			},
			{
				id: 'o2',
				status: 'paid',
				amountTotal: 6000,
				currency: 'usd',
				customerEmail: 'alice@x.com', // repeat customer
				date: '2026-09-02',
				items: [{ productId: 'p1', title: 'Tee', price: 3000, quantity: 2 }]
			},
			{
				id: 'o3',
				status: 'paid',
				amountTotal: 5000,
				currency: 'usd',
				customerEmail: 'bob@x.com', // single purchase customer
				date: '2026-09-03',
				items: [{ productId: 'p3', title: 'Hoodie', price: 5000, quantity: 1 }]
			}
		];

		const testVariants = [
			{ id: 'v1', productId: 'p1', sku: 'A', color: '', size: '', stockQuantity: 20 },
			{ id: 'v2', productId: 'p2', sku: 'B', color: '', size: '', stockQuantity: 3 },
			{ id: 'v3', productId: 'p3', sku: 'C', color: '', size: '', stockQuantity: 0 }
		];

		const metrics = computeDashboardMetrics(ordersWithItems, testVariants, {});

		// Top Products: Tee sold 4 units for 12000 cents, Hoodie 1 unit for 5000, Cap 1 unit for 4000
		expect(metrics.topProducts).toHaveLength(3);
		expect(metrics.topProducts[0]).toMatchObject({
			productId: 'p1',
			title: 'Tee',
			unitsSold: 4,
			revenueCents: 12000
		});
		expect(metrics.topProducts[0].sharePercent).toBeGreaterThan(0);

		// Catalog Health: 1 healthy (>5), 1 low stock (1-5), 1 out of stock (0)
		expect(metrics.catalogHealth).toEqual({
			totalVariants: 3,
			healthyCount: 1,
			lowStockCount: 1,
			outOfStockCount: 1
		});

		// Customer Insights: 2 total customers (alice, bob), alice repeated (2 orders, 16000 spent)
		expect(metrics.customerInsights.totalCustomers).toBe(2);
		expect(metrics.customerInsights.newCustomers).toBe(1);
		expect(metrics.customerInsights.repeatCustomers).toBe(1);
		expect(metrics.customerInsights.repeatRatePercent).toBe(50);
		expect(metrics.customerInsights.repeatRevenueCents).toBe(16000);
	});
});
