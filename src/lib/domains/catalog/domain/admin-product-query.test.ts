import { describe, it, expect } from 'vitest';
import {
	computeProductMetrics,
	countActiveFilters,
	filterProducts,
	getStockBucket,
	hasActiveControls,
	selectProducts,
	sortProducts,
	EMPTY_FILTERS,
	type ProductFilters
} from './admin-product-query';
// The threshold is owned by stock-status; this module delegates to it.
import { LOW_STOCK_THRESHOLD } from './stock-status';
import type { AdminProductRow } from './admin-product-row';

function row(overrides: Partial<AdminProductRow> = {}): AdminProductRow {
	return {
		id: 'p1',
		slug: 'p1',
		title: 'Product One',
		image: '',
		price: '$10.00',
		priceValue: 1000,
		totalStock: 10,
		variantCount: 1,
		isActive: true,
		isFeatured: false,
		categories: [{ id: 'c1', name: 'Shirts', slug: 'shirts' }],
		variants: [{ color: 'Red', size: 'M', sku: 'SKU-1', stockQuantity: 10 }],
		...overrides
	};
}

const filters = (over: Partial<ProductFilters> = {}): ProductFilters => ({
	...EMPTY_FILTERS,
	...over
});

describe('getStockBucket', () => {
	it('classifies zero as out_of_stock', () => {
		expect(getStockBucket(0)).toBe('out_of_stock');
	});

	it('classifies the threshold itself as low_stock', () => {
		// Boundary: <= threshold is low, > threshold is in. Off-by-one here would
		// silently misreport every product sitting exactly at 5.
		expect(getStockBucket(LOW_STOCK_THRESHOLD)).toBe('low_stock');
	});

	it('classifies one above the threshold as in_stock', () => {
		expect(getStockBucket(LOW_STOCK_THRESHOLD + 1)).toBe('in_stock');
	});
});

describe('filterProducts', () => {
	it('returns every row with no filters applied', () => {
		const rows = [row(), row({ id: 'p2', slug: 'p2' })];
		expect(filterProducts(rows, EMPTY_FILTERS)).toHaveLength(2);
	});

	it('matches search against title, slug, and variant sku', () => {
		const rows = [
			row({ id: 'a', title: 'Linen Shirt', slug: 'linen-shirt' }),
			row({
				id: 'b',
				title: 'Wool Coat',
				slug: 'wool-coat',
				variants: [{ color: 'Black', size: 'L', sku: 'COAT-XL', stockQuantity: 1 }]
			})
		];

		expect(filterProducts(rows, filters({ search: 'linen' })).map((r) => r.id)).toEqual(['a']);
		expect(filterProducts(rows, filters({ search: 'wool-coat' })).map((r) => r.id)).toEqual(['b']);
		expect(filterProducts(rows, filters({ search: 'coat-xl' })).map((r) => r.id)).toEqual(['b']);
	});

	it('treats a whitespace-only search as no search', () => {
		const rows = [row()];
		expect(filterProducts(rows, filters({ search: '   ' }))).toHaveLength(1);
	});

	it('matches category by id or by slug', () => {
		const rows = [row({ categories: [{ id: 'c1', name: 'Shirts', slug: 'shirts' }] })];

		expect(filterProducts(rows, filters({ categoryIds: ['c1'] }))).toHaveLength(1);
		expect(filterProducts(rows, filters({ categoryIds: ['shirts'] }))).toHaveLength(1);
		expect(filterProducts(rows, filters({ categoryIds: ['nope'] }))).toHaveLength(0);
	});

	it('ORs within the status group and the stock group', () => {
		const rows = [row({ id: 'active', isActive: true }), row({ id: 'inactive', isActive: false })];

		expect(filterProducts(rows, filters({ statuses: ['active'] })).map((r) => r.id)).toEqual([
			'active'
		]);
		expect(
			filterProducts(rows, filters({ statuses: ['active', 'inactive'] })).map((r) => r.id)
		).toEqual(['active', 'inactive']);

		const stockRows = [
			row({ id: 'out', totalStock: 0 }),
			row({ id: 'low', totalStock: 3 }),
			row({ id: 'ok', totalStock: 50 })
		];
		expect(
			filterProducts(stockRows, filters({ stocks: ['low_stock', 'out_of_stock'] })).map((r) => r.id)
		).toEqual(['out', 'low']);
	});

	it('ANDs across filter groups', () => {
		const rows = [
			row({ id: 'match', isActive: true, totalStock: 3 }),
			row({ id: 'inactive', isActive: false, totalStock: 3 }),
			row({ id: 'healthy', isActive: true, totalStock: 99 })
		];

		const result = filterProducts(rows, filters({ statuses: ['active'], stocks: ['low_stock'] }));
		expect(result.map((r) => r.id)).toEqual(['match']);
	});

	it('filters to featured only when asked', () => {
		const rows = [row({ id: 'f', isFeatured: true }), row({ id: 'n', isFeatured: false })];
		expect(filterProducts(rows, filters({ onlyFeatured: true })).map((r) => r.id)).toEqual(['f']);
	});

	it('does not mutate the input array', () => {
		const rows = [row({ id: 'a' }), row({ id: 'b' })];
		const before = rows.map((r) => r.id);
		filterProducts(rows, filters({ statuses: ['active'] }));
		expect(rows.map((r) => r.id)).toEqual(before);
	});
});

describe('sortProducts', () => {
	it('preserves server order for the default sort', () => {
		const rows = [row({ id: 'z', title: 'Z' }), row({ id: 'a', title: 'A' })];
		expect(sortProducts(rows, 'default').map((r) => r.id)).toEqual(['z', 'a']);
	});

	it('sorts by price and stock in both directions', () => {
		const rows = [
			row({ id: 'mid', priceValue: 2000, totalStock: 5 }),
			row({ id: 'low', priceValue: 1000, totalStock: 1 }),
			row({ id: 'high', priceValue: 3000, totalStock: 9 })
		];

		expect(sortProducts(rows, 'price_asc').map((r) => r.id)).toEqual(['low', 'mid', 'high']);
		expect(sortProducts(rows, 'price_desc').map((r) => r.id)).toEqual(['high', 'mid', 'low']);
		expect(sortProducts(rows, 'stock_asc').map((r) => r.id)).toEqual(['low', 'mid', 'high']);
		expect(sortProducts(rows, 'stock_desc').map((r) => r.id)).toEqual(['high', 'mid', 'low']);
	});

	it('does not mutate the input array when sorting', () => {
		const rows = [row({ id: 'b', title: 'B' }), row({ id: 'a', title: 'A' })];
		sortProducts(rows, 'title_asc');
		expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
	});
});

describe('selectProducts', () => {
	it('filters then sorts', () => {
		const rows = [
			row({ id: 'cheap', priceValue: 100, isActive: true }),
			row({ id: 'pricey', priceValue: 900, isActive: true }),
			row({ id: 'hidden', priceValue: 50, isActive: false })
		];

		const result = selectProducts(rows, filters({ statuses: ['active'], sortBy: 'price_asc' }));
		expect(result.map((r) => r.id)).toEqual(['cheap', 'pricey']);
	});
});

describe('computeProductMetrics', () => {
	it('counts each bucket and keeps needsAttention distinct from lowStock', () => {
		const rows = [
			row({ id: 'a', totalStock: 50 }), // in_stock
			row({ id: 'b', totalStock: 3 }), // low_stock
			row({ id: 'c', totalStock: 0 }), // out_of_stock
			row({ id: 'd', totalStock: 7, isActive: false }) // in_stock, inactive
		];

		const m = computeProductMetrics(rows);

		expect(m.total).toBe(4);
		expect(m.active).toBe(3);
		expect(m.inactive).toBe(1);
		expect(m.inStock).toBe(2);
		expect(m.lowStock).toBe(1);
		expect(m.outOfStock).toBe(1);
		// The original page had two separate expressions here — `lowStock`
		// (excludes zero) and `alertProducts` (includes it). They are not
		// interchangeable, so both counts are exposed explicitly.
		expect(m.needsAttention).toBe(2);
	});

	it('returns zeros for an empty table', () => {
		const m = computeProductMetrics([]);
		expect(m).toEqual({
			total: 0,
			active: 0,
			inactive: 0,
			inStock: 0,
			lowStock: 0,
			needsAttention: 0,
			outOfStock: 0
		});
	});
});

describe('filter affordances', () => {
	it('counts only the three multi-select groups', () => {
		expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
		expect(
			countActiveFilters(
				filters({ categoryIds: ['a'], statuses: ['active'], stocks: ['low_stock'] })
			)
		).toBe(3);
		// Search, featured and sort are shown elsewhere, so they do not count here.
		expect(countActiveFilters(filters({ search: 'x', onlyFeatured: true }))).toBe(0);
	});

	it('reports any deviation from the defaults', () => {
		expect(hasActiveControls(EMPTY_FILTERS)).toBe(false);
		expect(hasActiveControls(filters({ search: 'x' }))).toBe(true);
		expect(hasActiveControls(filters({ onlyFeatured: true }))).toBe(true);
		expect(hasActiveControls(filters({ sortBy: 'price_asc' }))).toBe(true);
		expect(hasActiveControls(filters({ stocks: ['low_stock'] }))).toBe(true);
	});
});
