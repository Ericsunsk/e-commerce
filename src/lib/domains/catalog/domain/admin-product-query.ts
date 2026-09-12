/**
 * Admin product table query (pure domain).
 *
 * The `/admin/products` page used to inline ~150 lines of filtering, sorting
 * and KPI derivation inside its `<script>`. That logic is pure — it takes rows
 * and filter state, returns rows and counts — so it belongs in `domain/`, where
 * it can be unit tested without mounting a component or mocking a fetch.
 *
 * Keeping it here also means the four stock buckets are defined once. They were
 * previously expressed as six separate `$derived` filters that each re-derived
 * the same thresholds inline, so "low stock" meant `> 0 && <= 5` in one place
 * and `<= 5` in another (that second one is `alertProducts`, which deliberately
 * includes zero — a distinction that was invisible until written down).
 */

import type { AdminProductRow } from './admin-product-row';
import { computeStockStatus, type StockStatus } from './stock-status';

export type StockBucket = StockStatus;
export type StatusFilter = 'active' | 'inactive';
export type ProductSortKey =
	| 'default'
	| 'price_asc'
	| 'price_desc'
	| 'stock_asc'
	| 'stock_desc'
	| 'title_asc'
	| 'title_desc';

export interface ProductFilters {
	search: string;
	categoryIds: string[];
	statuses: StatusFilter[];
	stocks: StockBucket[];
	onlyFeatured: boolean;
	sortBy: ProductSortKey;
}

export const EMPTY_FILTERS: ProductFilters = {
	search: '',
	categoryIds: [],
	statuses: [],
	stocks: [],
	onlyFeatured: false,
	sortBy: 'default'
};

/**
 * Which bucket a row's aggregate stock falls into.
 *
 * Delegates to `computeStockStatus` so the "low stock" threshold exists in
 * exactly one place. Writing it out again here would have meant two constants
 * with the same value that could drift apart.
 */
export function getStockBucket(totalStock: number): StockBucket {
	return computeStockStatus(totalStock);
}

/** Does this row match the search term? Matches title, slug, or any variant SKU. */
function matchesSearch(row: AdminProductRow, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;

	if (row.title.toLowerCase().includes(q)) return true;
	if (row.slug.toLowerCase().includes(q)) return true;
	return row.variants?.some((v) => v.sku.toLowerCase().includes(q)) ?? false;
}

/** Any of the selected ids (or slugs) on any of the row's categories. */
function matchesCategories(row: AdminProductRow, selected: string[]): boolean {
	if (selected.length === 0) return true;
	return row.categories?.some((c) => selected.includes(c.id) || selected.includes(c.slug)) ?? false;
}

function matchesStatus(row: AdminProductRow, selected: StatusFilter[]): boolean {
	if (selected.length === 0) return true;
	return (
		(selected.includes('active') && row.isActive) ||
		(selected.includes('inactive') && !row.isActive)
	);
}

function matchesStock(row: AdminProductRow, selected: StockBucket[]): boolean {
	if (selected.length === 0) return true;
	return selected.includes(getStockBucket(row.totalStock));
}

/** Apply every active filter. Returns a new array; never mutates the input. */
export function filterProducts(
	rows: AdminProductRow[],
	filters: ProductFilters
): AdminProductRow[] {
	return rows.filter(
		(row) =>
			matchesSearch(row, filters.search) &&
			matchesCategories(row, filters.categoryIds) &&
			matchesStatus(row, filters.statuses) &&
			matchesStock(row, filters.stocks) &&
			(!filters.onlyFeatured || row.isFeatured)
	);
}

/** Sort a copy by the given key. `'default'` preserves the server's order. */
export function sortProducts(rows: AdminProductRow[], sortBy: ProductSortKey): AdminProductRow[] {
	if (sortBy === 'default') return rows;
	const sorted = [...rows];

	switch (sortBy) {
		case 'price_asc':
			return sorted.sort((a, b) => a.priceValue - b.priceValue);
		case 'price_desc':
			return sorted.sort((a, b) => b.priceValue - a.priceValue);
		case 'stock_asc':
			return sorted.sort((a, b) => a.totalStock - b.totalStock);
		case 'stock_desc':
			return sorted.sort((a, b) => b.totalStock - a.totalStock);
		case 'title_asc':
			return sorted.sort((a, b) => a.title.localeCompare(b.title));
		case 'title_desc':
			return sorted.sort((a, b) => b.title.localeCompare(a.title));
		default:
			return sorted;
	}
}

/** Filter then sort — the pipeline the table renders. */
export function selectProducts(
	rows: AdminProductRow[],
	filters: ProductFilters
): AdminProductRow[] {
	return sortProducts(filterProducts(rows, filters), filters.sortBy);
}

/** How many filter groups are active (drives the filter badge). */
export function countActiveFilters(filters: ProductFilters): number {
	return filters.categoryIds.length + filters.statuses.length + filters.stocks.length;
}

/** Any control deviating from its default (drives the "reset" affordance). */
export function hasActiveControls(filters: ProductFilters): boolean {
	return (
		Boolean(filters.search) ||
		countActiveFilters(filters) > 0 ||
		filters.onlyFeatured ||
		filters.sortBy !== 'default'
	);
}

export interface ProductMetrics {
	total: number;
	active: number;
	inactive: number;
	inStock: number;
	lowStock: number;
	/** Low stock *or* out of stock — what an operator needs to act on. */
	needsAttention: number;
	outOfStock: number;
}

/** KPI tiles for the table header. One pass over the rows. */
export function computeProductMetrics(rows: AdminProductRow[]): ProductMetrics {
	let active = 0;
	let inStock = 0;
	let lowStock = 0;
	let outOfStock = 0;

	for (const row of rows) {
		if (row.isActive) active++;
		switch (getStockBucket(row.totalStock)) {
			case 'in_stock':
				inStock++;
				break;
			case 'low_stock':
				lowStock++;
				break;
			case 'out_of_stock':
				outOfStock++;
				break;
		}
	}

	return {
		total: rows.length,
		active,
		inactive: rows.length - active,
		inStock,
		lowStock,
		needsAttention: lowStock + outOfStock,
		outOfStock
	};
}
