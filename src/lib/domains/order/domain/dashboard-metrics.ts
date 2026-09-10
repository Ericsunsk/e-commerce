/**
 * Operations dashboard aggregation (pure domain).
 *
 * Computes GMV, pending-shipment counts, low-stock alerts, and recent
 * orders from already-fetched record batches — the server adapter loads
 * each collection once, so no N+1 queries are possible by construction.
 */

export interface MetricOrderItem {
	productId?: string;
	title?: string;
	price?: number;
	quantity?: number;
}

export interface MetricOrder {
	id: string;
	status: string;
	amountTotal: number;
	currency: string;
	customerEmail: string;
	date: string;
	items?: MetricOrderItem[];
}

export interface MetricVariant {
	id: string;
	productId: string;
	sku: string;
	color: string;
	size: string;
	stockQuantity: number;
}

export interface LowStockRow {
	variantId: string;
	productId: string;
	productTitle: string;
	sku: string;
	detail: string;
	stockQuantity: number;
}

export interface RecentOrderRow {
	id: string;
	date: string;
	status: string;
	total: number;
	currency: string;
	email: string;
}

export interface RevenuePoint {
	/** `MM-DD` label for the chart axis. */
	date: string;
	/** Revenue in major currency units (dollars), rounded to 2dp. */
	revenue: number;
}

export interface StatusSlice {
	key: string;
	label: string;
	value: number;
}

export interface MetricPoint {
	date: string;
	revenue: number;
	orders: number;
}

export interface RangeSummary {
	gmvCents: number;
	ordersCount: number;
	aovCents: number;
	uniqueCustomers: number;
	gmvChange: number;
	ordersChange: number;
	aovChange: number;
	trend: MetricPoint[];
	statusDistribution: StatusSlice[];
	sparkline: number[];
}

export type TimeRangeKey = 'today' | '7d' | '30d' | 'all';

export interface TopProductRow {
	productId: string;
	title: string;
	unitsSold: number;
	revenueCents: number;
	sharePercent: number;
}

export interface CatalogHealth {
	totalVariants: number;
	healthyCount: number;
	lowStockCount: number;
	outOfStockCount: number;
}

export interface CustomerInsights {
	totalCustomers: number;
	newCustomers: number;
	repeatCustomers: number;
	repeatRatePercent: number;
	repeatRevenueCents: number;
	repeatRevenuePercent: number;
}

export interface DashboardMetrics {
	/** Gross merchandise volume, in minor currency units (cents). */
	gmvCents: number;
	currency: string;
	pendingShipments: number;
	lowStockCount: number;
	lowStock: LowStockRow[];
	recentOrders: RecentOrderRow[];
	/** Last N days of daily revenue, zero-filled. */
	revenueTrend: RevenuePoint[];
	/** Order counts grouped by status. */
	ordersByStatus: StatusSlice[];
	/** Multi-window metrics for period switching. */
	ranges: Record<TimeRangeKey, RangeSummary>;
	totalOrdersCount: number;
	totalCustomersCount: number;
	overallAovCents: number;
	topProducts: TopProductRow[];
	catalogHealth: CatalogHealth;
	customerInsights: CustomerInsights;
}

import { ORDER_STATUS_LABELS } from './models';

export const LOW_STOCK_THRESHOLD = 5;
export const RECENT_ORDER_LIMIT = 5;
export const REVENUE_TREND_DAYS = 14;

function dayKey(time: number): string {
	const date = new Date(time);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function axisLabel(key: string): string {
	return key.slice(5); // `YYYY-MM-DD` → `MM-DD`
}

function calcPercentChange(current: number, previous: number): number {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return Math.round(((current - previous) / previous) * 1000) / 10;
}

function buildStatusDistribution(ordersSubset: MetricOrder[]): StatusSlice[] {
	const statusCounts = new Map<string, number>();
	for (const order of ordersSubset) {
		const status = order.status || 'unknown';
		statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
	}
	return [...statusCounts.entries()]
		.map(([key, value]) => ({ key, label: ORDER_STATUS_LABELS[key] ?? key, value }))
		.sort((a, b) => b.value - a.value);
}

/** Pure aggregation over in-memory batches (unit-testable). */
export function computeDashboardMetrics(
	orders: MetricOrder[],
	variants: MetricVariant[],
	productTitles: Map<string, string> | Record<string, string>,
	now: number = Date.now()
): DashboardMetrics {
	const titleOf = (productId: string): string =>
		productTitles instanceof Map
			? (productTitles.get(productId) ?? productId)
			: (productTitles[productId] ?? productId);

	const gmvCents = orders.reduce(
		(acc, order) => acc + (Number.isFinite(order.amountTotal) ? order.amountTotal : 0),
		0
	);
	const currency = orders.find((order) => order.currency)?.currency ?? 'usd';
	const pendingShipments = orders.filter((order) => order.status === 'paid').length;

	const lowStock = variants
		.filter((variant) => variant.stockQuantity <= LOW_STOCK_THRESHOLD)
		.sort((a, b) => a.stockQuantity - b.stockQuantity)
		.map((variant) => ({
			variantId: variant.id,
			productId: variant.productId,
			productTitle: titleOf(variant.productId),
			sku: variant.sku,
			detail: [variant.color, variant.size].filter(Boolean).join(' / '),
			stockQuantity: variant.stockQuantity
		}));

	const recentOrders = [...orders]
		.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
		.slice(0, RECENT_ORDER_LIMIT)
		.map((order) => ({
			id: order.id,
			date: order.date,
			status: order.status,
			total: order.amountTotal,
			currency: order.currency,
			email: order.customerEmail
		}));

	const dayMs = 24 * 60 * 60 * 1000;
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const todayStartTime = todayStart.getTime();
	const todayEndTime = todayStartTime + dayMs;

	const revenueByDay = new Map<string, number>();
	for (const order of orders) {
		const time = new Date(order.date).getTime();
		if (!Number.isFinite(time)) continue;
		const key = dayKey(time);
		revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.amountTotal);
	}
	const revenueTrend: RevenuePoint[] = [];
	for (let i = REVENUE_TREND_DAYS - 1; i >= 0; i--) {
		const key = dayKey(todayStart.getTime() - i * dayMs);
		revenueTrend.push({
			date: axisLabel(key),
			revenue: Math.round(revenueByDay.get(key) ?? 0) / 100
		});
	}

	const statusCounts = new Map<string, number>();
	for (const order of orders) {
		const status = order.status || 'unknown';
		statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
	}
	const ordersByStatus: StatusSlice[] = [...statusCounts.entries()]
		.map(([key, value]) => ({ key, label: ORDER_STATUS_LABELS[key] ?? key, value }))
		.sort((a, b) => b.value - a.value);

	const orderTime = (o: MetricOrder) => {
		const t = new Date(o.date).getTime();
		return Number.isFinite(t) ? t : -1;
	};

	// 1. Today vs Yesterday
	const todayOrders = orders.filter((o) => {
		const t = orderTime(o);
		return t >= todayStartTime && t < todayEndTime;
	});
	const yesterdayOrders = orders.filter((o) => {
		const t = orderTime(o);
		return t >= todayStartTime - dayMs && t < todayStartTime;
	});

	const todayTrend: MetricPoint[] = [];
	for (let h = 0; h < 24; h += 2) {
		const bStart = todayStartTime + h * 3600 * 1000;
		const bEnd = bStart + 2 * 3600 * 1000;
		const bOrders = todayOrders.filter((o) => {
			const t = orderTime(o);
			return t >= bStart && t < bEnd;
		});
		const bRev = bOrders.reduce((sum, o) => sum + (Number.isFinite(o.amountTotal) ? o.amountTotal : 0), 0);
		todayTrend.push({
			date: `${String(h).padStart(2, '0')}:00`,
			revenue: Math.round(bRev) / 100,
			orders: bOrders.length
		});
	}

	// 2. 7 Days vs Previous 7 Days
	const start7d = todayStartTime - 6 * dayMs;
	const prevStart7d = todayStartTime - 13 * dayMs;
	const orders7d = orders.filter((o) => {
		const t = orderTime(o);
		return t >= start7d && t < todayEndTime;
	});
	const prevOrders7d = orders.filter((o) => {
		const t = orderTime(o);
		return t >= prevStart7d && t < start7d;
	});

	const trend7d: MetricPoint[] = [];
	for (let i = 6; i >= 0; i--) {
		const dayT = todayStartTime - i * dayMs;
		const nextDayT = dayT + dayMs;
		const dOrders = orders.filter((o) => {
			const t = orderTime(o);
			return t >= dayT && t < nextDayT;
		});
		const dRev = dOrders.reduce((sum, o) => sum + (Number.isFinite(o.amountTotal) ? o.amountTotal : 0), 0);
		trend7d.push({
			date: axisLabel(dayKey(dayT)),
			revenue: Math.round(dRev) / 100,
			orders: dOrders.length
		});
	}

	// 3. 30 Days vs Previous 30 Days
	const start30d = todayStartTime - 29 * dayMs;
	const prevStart30d = todayStartTime - 59 * dayMs;
	const orders30d = orders.filter((o) => {
		const t = orderTime(o);
		return t >= start30d && t < todayEndTime;
	});
	const prevOrders30d = orders.filter((o) => {
		const t = orderTime(o);
		return t >= prevStart30d && t < start30d;
	});

	const trend30d: MetricPoint[] = [];
	for (let i = 29; i >= 0; i--) {
		const dayT = todayStartTime - i * dayMs;
		const nextDayT = dayT + dayMs;
		const dOrders = orders.filter((o) => {
			const t = orderTime(o);
			return t >= dayT && t < nextDayT;
		});
		const dRev = dOrders.reduce((sum, o) => sum + (Number.isFinite(o.amountTotal) ? o.amountTotal : 0), 0);
		trend30d.push({
			date: axisLabel(dayKey(dayT)),
			revenue: Math.round(dRev) / 100,
			orders: dOrders.length
		});
	}

	function buildRangeSummary(
		windowOrders: MetricOrder[],
		prevOrders: MetricOrder[],
		trendPoints: MetricPoint[]
	): RangeSummary {
		const gmv = windowOrders.reduce((acc, o) => acc + (Number.isFinite(o.amountTotal) ? o.amountTotal : 0), 0);
		const count = windowOrders.length;
		const aov = count > 0 ? Math.round(gmv / count) : 0;
		const custs = new Set(windowOrders.map((o) => o.customerEmail).filter(Boolean)).size;

		const prevGmv = prevOrders.reduce((acc, o) => acc + (Number.isFinite(o.amountTotal) ? o.amountTotal : 0), 0);
		const prevCount = prevOrders.length;
		const prevAov = prevCount > 0 ? Math.round(prevGmv / prevCount) : 0;

		return {
			gmvCents: gmv,
			ordersCount: count,
			aovCents: aov,
			uniqueCustomers: custs,
			gmvChange: calcPercentChange(gmv, prevGmv),
			ordersChange: calcPercentChange(count, prevCount),
			aovChange: calcPercentChange(aov, prevAov),
			trend: trendPoints,
			statusDistribution: buildStatusDistribution(windowOrders),
			sparkline: trendPoints.map((p) => p.revenue)
		};
	}

	const ranges: Record<TimeRangeKey, RangeSummary> = {
		today: buildRangeSummary(todayOrders, yesterdayOrders, todayTrend),
		'7d': buildRangeSummary(orders7d, prevOrders7d, trend7d),
		'30d': buildRangeSummary(orders30d, prevOrders30d, trend30d),
		all: buildRangeSummary(orders, prevOrders30d, trend30d)
	};

	const totalOrdersCount = orders.length;
	const totalCustomersCount = new Set(orders.map((o) => o.customerEmail).filter(Boolean)).size;
	const overallAovCents = totalOrdersCount > 0 ? Math.round(gmvCents / totalOrdersCount) : 0;

	// Top Products by Revenue & Volume
	const productSales = new Map<string, { title: string; unitsSold: number; revenueCents: number }>();
	for (const order of orders) {
		if (Array.isArray(order.items) && order.items.length > 0) {
			for (const item of order.items) {
				const pId = item.productId || 'unknown';
				const itemTitle = item.title || titleOf(pId);
				const qty = Number(item.quantity) || 1;
				const itemTotal = (Number(item.price) || 0) * qty;
				const current = productSales.get(pId) ?? { title: itemTitle, unitsSold: 0, revenueCents: 0 };
				current.unitsSold += qty;
				current.revenueCents += itemTotal;
				if (!current.title && itemTitle) current.title = itemTitle;
				productSales.set(pId, current);
			}
		}
	}

	const totalItemsRevenue = [...productSales.values()].reduce((sum, p) => sum + p.revenueCents, 0) || gmvCents || 1;
	const topProducts: TopProductRow[] = [...productSales.entries()]
		.map(([productId, data]) => ({
			productId,
			title: data.title || titleOf(productId),
			unitsSold: data.unitsSold,
			revenueCents: data.revenueCents,
			sharePercent: Math.min(100, Math.round((data.revenueCents / totalItemsRevenue) * 1000) / 10)
		}))
		.sort((a, b) => b.revenueCents - a.revenueCents || b.unitsSold - a.unitsSold)
		.slice(0, 5);

	// Catalog Health Breakdown
	const totalVariants = variants.length;
	const outOfStockCount = variants.filter((v) => v.stockQuantity === 0).length;
	const catalogLowStockCount = variants.filter(
		(v) => v.stockQuantity > 0 && v.stockQuantity <= LOW_STOCK_THRESHOLD
	).length;
	const healthyCount = variants.filter((v) => v.stockQuantity > LOW_STOCK_THRESHOLD).length;

	const catalogHealth: CatalogHealth = {
		totalVariants,
		healthyCount,
		lowStockCount: catalogLowStockCount,
		outOfStockCount
	};

	// Customer Insights (New vs Repeat)
	const customerOrders = new Map<string, { count: number; totalSpent: number }>();
	for (const order of orders) {
		const email = order.customerEmail?.trim().toLowerCase();
		if (!email) continue;
		const current = customerOrders.get(email) ?? { count: 0, totalSpent: 0 };
		current.count += 1;
		current.totalSpent += Number(order.amountTotal) || 0;
		customerOrders.set(email, current);
	}

	const totalCustomers = customerOrders.size;
	let newCustomers = 0;
	let repeatCustomers = 0;
	let repeatRevenueCents = 0;

	for (const { count, totalSpent } of customerOrders.values()) {
		if (count >= 2) {
			repeatCustomers++;
			repeatRevenueCents += totalSpent;
		} else {
			newCustomers++;
		}
	}

	const repeatRatePercent = totalCustomers > 0
		? Math.round((repeatCustomers / totalCustomers) * 1000) / 10
		: 0;
	const repeatRevenuePercent = gmvCents > 0
		? Math.round((repeatRevenueCents / gmvCents) * 1000) / 10
		: 0;

	const customerInsights: CustomerInsights = {
		totalCustomers,
		newCustomers,
		repeatCustomers,
		repeatRatePercent,
		repeatRevenueCents,
		repeatRevenuePercent
	};

	return {
		gmvCents,
		currency,
		pendingShipments,
		lowStockCount: lowStock.length,
		lowStock,
		recentOrders,
		revenueTrend,
		ordersByStatus,
		ranges,
		totalOrdersCount,
		totalCustomersCount,
		overallAovCents,
		topProducts,
		catalogHealth,
		customerInsights
	};
}
