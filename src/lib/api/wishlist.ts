// Similar to cart API helper but for wishlist
import { apiClient } from '$lib/api/client';
import type { WishlistItem } from '$lib/types';

interface WishlistResponse {
	items: WishlistItem[];
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
	const data = await apiClient<WishlistResponse>('/api/wishlist');
	return data.items || [];
}

export async function addToWishlistAPI(item: WishlistItem): Promise<WishlistResponse> {
	return apiClient<WishlistResponse>('/api/wishlist', {
		method: 'POST',
		body: JSON.stringify(item)
	});
}

export async function removeFromWishlistAPI(
	id: string,
	variantId?: string
): Promise<WishlistResponse> {
	return apiClient<WishlistResponse>('/api/wishlist', {
		method: 'DELETE',
		body: JSON.stringify({ id, variantId })
	});
}
