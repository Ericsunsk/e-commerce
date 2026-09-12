/**
 * Cart list mutations (pure domain).
 *
 * Owns cart item quantity merging and mutation rules. Operates on plain
 * arrays so it is unit-testable in-memory; persistence stays behind the
 * Shared Infrastructure document seam.
 */
import {
	isSameCartItem,
	mergeCartItemQuantity,
	removeCartItemByIdentity,
	setCartItemQuantityByIdentity,
	type CartItem,
	type CartItemIdentity
} from './models';

export interface CartItemQuantityPatch {
	id: string;
	variantId?: string;
	quantity: number;
}

/** POST: merge incoming quantity into an identical line, else append. */
export function postCartItem(
	current: CartItem[],
	incoming: CartItem
): { items: CartItem[]; changed: boolean } {
	return { items: mergeCartItemQuantity(current, incoming), changed: true };
}

/** PATCH: set absolute quantity (<=0 removes the line). */
export function patchCartItemQuantity(
	current: CartItem[],
	payload: CartItemQuantityPatch
): CartItem[] {
	const exists = current.some((item) => isSameCartItem(item, payload));
	if (!exists) {
		throw { status: 404, message: 'Item not found in cart' };
	}
	return setCartItemQuantityByIdentity(current, payload, payload.quantity);
}

/** DELETE: remove the exact id+variant line. */
export function removeCartItem(current: CartItem[], payload: CartItemIdentity): CartItem[] {
	return removeCartItemByIdentity(current, payload);
}

/**
 * Merge a guest `localStorage` cart into the remote account cart.
 * Same id+variant lines sum quantities (additive); distinct lines append.
 * Pure — the caller persists the result and clears guest storage.
 */
export function mergeCartLists(remote: CartItem[], guest: CartItem[]): CartItem[] {
	return guest.reduce((acc, item) => mergeCartItemQuantity(acc, item), [...remote]);
}
