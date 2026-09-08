import { describe, it, expect } from 'vitest';
import { postCartItem, patchCartItemQuantity, removeCartItem } from './list-mutations';
import type { CartItem } from './models';

const line = (overrides: Partial<CartItem> = {}): CartItem => ({
	id: 'p1',
	quantity: 1,
	...overrides
});

describe('cart list mutations', () => {
	it('merges quantity for identical id+variant lines, appends otherwise', () => {
		const current = [line({ quantity: 2, variantId: 'v1' })];

		const merged = postCartItem(current, line({ quantity: 3, variantId: 'v1' }));
		expect(merged.changed).toBe(true);
		expect(merged.items).toHaveLength(1);
		expect(merged.items[0].quantity).toBe(5);

		const appended = postCartItem(current, line({ quantity: 1, variantId: 'v2' }));
		expect(appended.changed).toBe(true);
		expect(appended.items).toHaveLength(2);

		// Variant mismatch counts as a different line.
		const noVariant = postCartItem(current, line({ quantity: 1 }));
		expect(noVariant.items).toHaveLength(2);
	});

	it('sets absolute quantity and removes the line at zero', () => {
		const current = [line({ quantity: 2, variantId: 'v1' })];

		expect(
			patchCartItemQuantity(current, { id: 'p1', variantId: 'v1', quantity: 5 })
		).toMatchObject([{ quantity: 5 }]);

		expect(patchCartItemQuantity(current, { id: 'p1', variantId: 'v1', quantity: 0 })).toHaveLength(
			0
		);
	});

	it('rejects patching a missing line with 404', () => {
		try {
			patchCartItemQuantity([], { id: 'p1', quantity: 2 });
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ status: 404 });
		}
	});

	it('removes only the exact id+variant line', () => {
		const current = [
			line({ quantity: 1, variantId: 'v1' }),
			line({ quantity: 2, variantId: 'v2' }),
			{ ...line({ quantity: 1 }), id: 'p2' }
		];

		const next = removeCartItem(current, { id: 'p1', variantId: 'v1' });
		expect(next).toHaveLength(2);
		expect(next.some((i) => i.variantId === 'v1')).toBe(false);
	});
});
