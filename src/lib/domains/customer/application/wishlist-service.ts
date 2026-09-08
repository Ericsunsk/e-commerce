import {
	fetchWishlist,
	addToWishlistAPI,
	removeFromWishlistAPI
} from '../infrastructure/wishlist-api.client';
import type { WishlistItem } from '../domain/models';

export async function getCustomerWishlist(): Promise<WishlistItem[]> {
	return fetchWishlist();
}

export async function addCustomerWishlistItem(item: WishlistItem): Promise<WishlistItem[]> {
	const res = await addToWishlistAPI(item);
	return res.items;
}

export async function removeCustomerWishlistItem(
	id: string,
	variantId?: string
): Promise<WishlistItem[]> {
	const res = await removeFromWishlistAPI(id, variantId);
	return res.items;
}
