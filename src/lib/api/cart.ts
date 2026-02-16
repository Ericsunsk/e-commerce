import type { CartItem } from '$lib/types';
import {
	addUserListItem,
	fetchUserList,
	patchUserListItemQuantity,
	removeUserListItem,
	type UserListResponse
} from '$lib/api/user-list';

type CartResponse = UserListResponse<CartItem>;
const CART_ENDPOINT = '/api/cart' as const;

export async function fetchCart(): Promise<CartItem[]> {
	return fetchUserList<CartItem>(CART_ENDPOINT);
}

export async function addToCartAPI(item: CartItem): Promise<CartResponse> {
	return addUserListItem<CartItem>(CART_ENDPOINT, item);
}

export async function updateCartItemAPI(
	id: string,
	variantId: string | undefined,
	quantity: number
): Promise<CartResponse> {
	return patchUserListItemQuantity<CartItem>(CART_ENDPOINT, { id, variantId, quantity });
}

export async function removeFromCartAPI(id: string, variantId?: string): Promise<CartResponse> {
	return removeUserListItem<CartItem>(CART_ENDPOINT, { id, variantId });
}
