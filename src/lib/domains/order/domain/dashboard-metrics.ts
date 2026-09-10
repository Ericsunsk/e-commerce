/**
 * Operations dashboard aggregation (pure domain).
 *
 * Computes GMV, pending-shipment counts, low-stock alerts, and recent
 * orders from already-fetched record batches — the server adapter loads
 * each collection once, so no N+1 queries are possible by construction.
 */

export interface MetricOrder {
	id: string;
	status: string;
	amountTotal: number;
	currency: string;
	customerEmail: string;
	date: string;
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

	return {
		gmvCents,
		currency,
		pendingShipments,
		lowStockCount: lowStock.length,
		lowStock,
		recentOrders,
		revenueTrend,
		ordersByStatus
	};
}
