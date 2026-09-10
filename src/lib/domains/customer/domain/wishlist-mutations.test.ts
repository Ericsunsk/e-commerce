import { describe, it, expect } from 'vitest';
import {
	postWishlistItem,
	removeWishlistItem,
	mergeWishlistLists,
	diffWishlistLists
} from './wishlist-mutations';
import type { WishlistItem } from './models';

describe('wishlist mutations', () => {
	it('keeps id+variant pairs unique on post', () => {
		const current: WishlistItem[] = [{ id: 'p1', variantId: 'v1' }];

		const duplicate = postWishlistItem(current, { id: 'p1', variantId: 'v1' });
		expect(duplicate.changed).toBe(false);
		expect(duplicate.items).toHaveLength(1);

		const otherVariant = postWishlistItem(current, { id: 'p1', variantId: 'v2' });
		expect(otherVariant.changed).toBe(true);
		expect(otherVariant.items).toHaveLength(2);

		const otherProduct = postWishlistItem(current, { id: 'p2' });
		expect(otherProduct.changed).toBe(true);
		expect(otherProduct.items).toHaveLength(2);
	});

	it('removes the exact id+variant line when variantId is given', () => {
		const current: WishlistItem[] = [
			{ id: 'p1', variantId: 'v1' },
			{ id: 'p1', variantId: 'v2' },
			{ id: 'p2' }
		];

		const next = removeWishlistItem(current, { id: 'p1', variantId: 'v1' });
		expect(next).toHaveLength(2);
		expect(next).toContainEqual({ id: 'p1', variantId: 'v2' });
	});

	it('removes all lines for a product when variantId is missing', () => {
		const current: WishlistItem[] = [
			{ id: 'p1', variantId: 'v1' },
			{ id: 'p1', variantId: 'v2' },
			{ id: 'p2' }
		];

		const next = removeWishlistItem(current, { id: 'p1' });
		expect(next).toEqual([{ id: 'p2' }]);
	});

	it('merges guest and remote wishlists as a deduplicated union', () => {
		const remote: WishlistItem[] = [{ id: 'p1', variantId: 'v1' }, { id: 'p2' }];
		const guest: WishlistItem[] = [
			{ id: 'p1', variantId: 'v1' },
			{ id: 'p1', variantId: 'v2' },
			{ id: 'p3' }
		];

		expect(mergeWishlistLists(remote, guest)).toEqual([
			{ id: 'p1', variantId: 'v1' },
			{ id: 'p2' },
			{ id: 'p1', variantId: 'v2' },
			{ id: 'p3' }
		]);
		expect(mergeWishlistLists([], [])).toEqual([]);
	});

	it('diffs only guest items missing remotely for sync', () => {
		const remote: WishlistItem[] = [{ id: 'p1', variantId: 'v1' }];
		const guest: WishlistItem[] = [{ id: 'p1', variantId: 'v1' }, { id: 'p2' }];

		expect(diffWishlistLists(remote, guest)).toEqual([{ id: 'p2' }]);
		expect(diffWishlistLists(remote, remote)).toEqual([]);
	});
});
