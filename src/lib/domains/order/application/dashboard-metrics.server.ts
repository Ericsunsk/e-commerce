/**
 * Operations dashboard queries (server-only).
 *
 * Loads each collection exactly once (orders, variants, referenced
 * products) and aggregates via the pure `computeDashboardMetrics` domain
 * module — no per-row queries.
 */
import { withAdmin } from '$shared/infrastructure/server';
import {
	Collections,
	type OrdersResponse,
	type ProductsResponse,
	type ProductVariantsResponse,
	type TypedPocketBase
} from '$shared/infrastructure';
import {
	computeDashboardMetrics,
	type DashboardMetrics,
	type MetricOrderItem
} from '../domain/dashboard-metrics';

async function fetchDashboardBatches(pb: TypedPocketBase) {
	const orders = (await pb.collection(Collections.Orders).getFullList({
		sort: '-placed_at_override,-placed_at'
	})) as OrdersResponse[];

	const variants = (await pb
		.collection(Collections.ProductVariants)
		.getFullList()) as ProductVariantsResponse[];

	const productIds = [...new Set(variants.map((variant) => variant.product))].filter(Boolean);
	let products: ProductsResponse[] = [];
	if (productIds.length > 0) {
		const filter = productIds.map((id) => `id="${id}"`).join('||');
		products = (await pb
			.collection(Collections.Products)
			.getFullList({ filter })) as ProductsResponse[];
	}
	return { orders, variants, products };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
	return withAdmin(async (pb) => {
		const { orders, variants, products } = await fetchDashboardBatches(pb);
		const titles = new Map(products.map((product) => [product.id, product.title]));
		return computeDashboardMetrics(
			orders.map((order) => ({
				id: order.id,
				status: String(order.status ?? ''),
				amountTotal: Number(order.amount_total) || 0,
				currency: order.currency || 'usd',
				customerEmail: order.customer_email || '',
				date: order.placed_at_override || String(order.placed_at || ''),
				items: Array.isArray(order.items) ? (order.items as unknown as MetricOrderItem[]) : []
			})),
			variants.map((variant) => ({
				id: variant.id,
				productId: variant.product,
				sku: variant.sku,
				color: variant.color,
				size: variant.size,
				stockQuantity: Number(variant.stock_quantity) || 0
			})),
			titles
		);
	});
}
