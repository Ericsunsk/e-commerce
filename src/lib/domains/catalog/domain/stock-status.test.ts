import { describe, it, expect } from 'vitest';
import { computeStockStatus, STOCK_STATUS } from './stock-status';
import { getCatalogFilters } from './filters';

describe('catalog domain logic', () => {
	it('should compute stock status accurately', () => {
		expect(computeStockStatus(0)).toBe(STOCK_STATUS.OUT_OF_STOCK);
		expect(computeStockStatus(-2)).toBe(STOCK_STATUS.OUT_OF_STOCK);
		expect(computeStockStatus(3)).toBe(STOCK_STATUS.LOW_STOCK);
		expect(computeStockStatus(5)).toBe(STOCK_STATUS.LOW_STOCK);
		expect(computeStockStatus(6)).toBe(STOCK_STATUS.IN_STOCK);
		expect(computeStockStatus(100)).toBe(STOCK_STATUS.IN_STOCK);
	});

	it('should parse catalog filters from url', () => {
		const url = new URL('https://example.com/shop?category=tops&gender=womens');
		const filters = getCatalogFilters(url, 'shop');

		expect(filters.categorySlug).toBe('tops');
		expect(filters.gender).toBe('womens');
		expect(filters.pageSlug).toBe('womens');
	});
});
