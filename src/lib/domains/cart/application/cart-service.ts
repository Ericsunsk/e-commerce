import {
	getGuestCart,
	saveGuestCart,
	clearGuestCart
} from '../infrastructure/cart-storage.client';
import {
	fetchCart,
	addToCartAPI,
	updateCartItemAPI,
	removeFromCartAPI
} from '../infrastructure/cart-api.client';
import {
	mergeCartItemQuantity,
	removeCartItemByIdentity,
	setCartItemQuantityByIdentity,
	type CartItem
} from '../domain/models';

export async function getCartItems(isAuthenticated: boolean): Promise<CartItem[]> {
	if (isAuthenticated) {
		return fetchCart();
	}
	return getGuestCart();
}

export async function addItemToCart(
	item: CartItem,
	isAuthenticated: boolean
): Promise<CartItem[]> {
	if (isAuthenticated) {
		const res = await addToCartAPI(item);
		return res.items;
	}

	const current = getGuestCart();
	const next = mergeCartItemQuantity(current, item);
	saveGuestCart(next);
	return next;
}

export async function updateItemQuantity(
	id: string,
	variantId: string | undefined,
	quantity: number,
	isAuthenticated: boolean
): Promise<CartItem[]> {
	if (isAuthenticated) {
		const res = await updateCartItemAPI(id, variantId, quantity);
		return res.items;
	}

	const current = getGuestCart();
	const next = setCartItemQuantityByIdentity(current, { id, variantId }, quantity);
	saveGuestCart(next);
	return next;
}

export async function removeItemFromCart(
	id: string,
	variantId: string | undefined,
	isAuthenticated: boolean
): Promise<CartItem[]> {
	if (isAuthenticated) {
		const res = await removeFromCartAPI(id, variantId);
		return res.items;
	}

	const current = getGuestCart();
	const next = removeCartItemByIdentity(current, { id, variantId });
	saveGuestCart(next);
	return next;
}

export async function syncGuestCartToUser(): Promise<void> {
	const guestItems = getGuestCart();
	if (guestItems.length === 0) return;

	for (const item of guestItems) {
		try {
			await addToCartAPI(item);
		} catch (err) {
			console.error('Failed to sync guest cart item to user:', err);
		}
	}
	clearGuestCart();
}

export function clearCart(isAuthenticated: boolean): void {
	if (!isAuthenticated) {
		clearGuestCart();
	}
}
