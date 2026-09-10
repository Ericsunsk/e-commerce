import { describe, it, expect } from 'vitest';
import {
	isStorefrontVisible,
	filterVisibleProducts,
	normalizeActiveToggle
} from './product-visibility';

describe('product visibility', () => {
	it('hides only explicitly deactivated products', () => {
		expect(isStorefrontVisible({ is_active: true })).toBe(true);
		expect(isStorefrontVisible({ is_active: false })).toBe(false);
		// Legacy rows without the field stay visible.
		expect(isStorefrontVisible({})).toBe(true);
		expect(isStorefrontVisible(null)).toBe(false);
	});

	it('filters lists while preserving order', () => {
		const rows = [{ id: 'a', is_active: true }, { id: 'b', is_active: false }, { id: 'c' }];
		expect(filterVisibleProducts(rows).map((r) => r.id)).toEqual(['a', 'c']);
	});

	it('validates the admin toggle payload strictly', () => {
		expect(normalizeActiveToggle({ is_active: true })).toBe(true);
		expect(normalizeActiveToggle({ is_active: false })).toBe(false);
		for (const bad of [null, {}, { is_active: 'yes' }, { is_active: 1 }]) {
			try {
				normalizeActiveToggle(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});
});
