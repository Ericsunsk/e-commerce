import type { WishlistItem } from '$lib/types';
import {
	addUserListItem,
	fetchUserList,
	removeUserListItem,
	type UserListResponse
} from '$lib/api/user-list';

type WishlistResponse = UserListResponse<WishlistItem>;
const WISHLIST_ENDPOINT = '/api/wishlist' as const;

export async function fetchWishlist(): Promise<WishlistItem[]> {
	return fetchUserList<WishlistItem>(WISHLIST_ENDPOINT);
}

export async function addToWishlistAPI(item: WishlistItem): Promise<WishlistResponse> {
	return addUserListItem<WishlistItem>(WISHLIST_ENDPOINT, item);
}

export async function removeFromWishlistAPI(
	id: string,
	variantId?: string
): Promise<WishlistResponse> {
	return removeUserListItem<WishlistItem>(WISHLIST_ENDPOINT, { id, variantId });
}
