import { apiClient } from '$shared/infrastructure';
import type { WishlistItem } from '../domain/models';

export interface WishlistResponse {
	items: WishlistItem[];
}

const WISHLIST_ENDPOINT = '/api/wishlist' as const;

export async function fetchWishlist(): Promise<WishlistItem[]> {
	const data = await apiClient<WishlistResponse>(WISHLIST_ENDPOINT);
	return data.items || [];
}

export async function addToWishlistAPI(item: WishlistItem): Promise<WishlistResponse> {
	return apiClient<WishlistResponse>(WISHLIST_ENDPOINT, {
		method: 'POST',
		body: JSON.stringify(item)
	});
}

export async function removeFromWishlistAPI(
	id: string,
	variantId?: string
): Promise<WishlistResponse> {
	return apiClient<WishlistResponse>(WISHLIST_ENDPOINT, {
		method: 'DELETE',
		body: JSON.stringify({ id, variantId })
	});
}
