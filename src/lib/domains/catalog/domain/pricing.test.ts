import { describe, it, expect } from 'vitest';
import { getCompareAtPrice, getDiscountPercent } from './pricing';

describe('compare-at pricing', () => {
	it('reads numeric or string compare-at values', () => {
		expect(getCompareAtPrice({ priceValue: 70, attributes: { compare_at_price: 100 } })).toBe(100);
		expect(getCompareAtPrice({ priceValue: 70, attributes: { compare_at_price: '100' } })).toBe(
			100
		);
		expect(getCompareAtPrice({ priceValue: 70 })).toBeNull();
		expect(getCompareAtPrice({ priceValue: 70, attributes: { compare_at_price: 0 } })).toBeNull();
		expect(
			getCompareAtPrice({ priceValue: 70, attributes: { compare_at_price: 'abc' } })
		).toBeNull();
	});

	it('computes rounded discount only when original sits above price', () => {
		expect(getDiscountPercent({ priceValue: 70, attributes: { compare_at_price: 100 } })).toBe(30);
		expect(
			getDiscountPercent({ priceValue: 100, attributes: { compare_at_price: 100 } })
		).toBeNull();
		expect(
			getDiscountPercent({ priceValue: 120, attributes: { compare_at_price: 100 } })
		).toBeNull();
		expect(getDiscountPercent({ priceValue: 70 })).toBeNull();
		expect(getDiscountPercent({ priceValue: 0, attributes: { compare_at_price: 100 } })).toBeNull();
	});
});
