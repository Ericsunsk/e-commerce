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

export interface DashboardMetrics {
	/** Gross merchandise volume, in minor currency units (cents). */
	gmvCents: number;
	currency: string;
	pendingShipments: number;
	lowStockCount: number;
	lowStock: LowStockRow[];
	recentOrders: RecentOrderRow[];
}

export const LOW_STOCK_THRESHOLD = 5;
export const RECENT_ORDER_LIMIT = 5;

/** Pure aggregation over in-memory batches (unit-testable). */
export function computeDashboardMetrics(
	orders: MetricOrder[],
	variants: MetricVariant[],
	productTitles: Map<string, string> | Record<string, string>
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

	return {
		gmvCents,
		currency,
		pendingShipments,
		lowStockCount: lowStock.length,
		lowStock,
		recentOrders
	};
}
