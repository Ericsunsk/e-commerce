/**
 * Wishlist mutations (pure domain).
 *
 * Owns wishlist item uniqueness and management rules. Operates on plain
 * arrays so it is unit-testable in-memory; persistence stays behind the
 * Shared Infrastructure document seam.
 */
import type { WishlistItem } from './models';
export interface WishlistItemIdentity {
	id: string;
	variantId?: string;
}

function isSameWishlistItem(
	item: Pick<WishlistItem, 'id' | 'variantId'>,
	target: Pick<WishlistItem, 'id' | 'variantId'>
): boolean {
	return item.id === target.id && item.variantId === target.variantId;
}

/** POST: append only when the id+variant pair is absent (uniqueness). */
export function postWishlistItem(
	current: WishlistItem[],
	incoming: WishlistItem
): { items: WishlistItem[]; changed: boolean } {
	if (current.some((item) => isSameWishlistItem(item, incoming))) {
		return { items: current, changed: false };
	}
	return { items: [...current, incoming], changed: true };
}

/**
 * DELETE: exact id+variant match; when variantId is missing, remove all
 * lines for the product id.
 */
export function removeWishlistItem(
	current: WishlistItem[],
	payload: WishlistItemIdentity
): WishlistItem[] {
	if (typeof payload.variantId !== 'string' || payload.variantId.length === 0) {
		return current.filter((item) => item.id !== payload.id);
	}
	return current.filter((item) => !isSameWishlistItem(item, payload));
}
