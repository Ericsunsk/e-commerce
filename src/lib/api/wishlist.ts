// Similar to cart API helper but for wishlist
import { apiClient } from '$lib/api/client';

interface WishlistItem {
    id: string;
    variantId?: string;
    title?: string;
    price?: number;
    image?: string;
    slug?: string;
}

interface WishlistResponse {
    items: WishlistItem[];
    updated?: string;
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

export async function removeFromWishlistAPI(id: string, variantId?: string): Promise<WishlistResponse> {
    return apiClient<WishlistResponse>('/api/wishlist', {
        method: 'DELETE',
        body: JSON.stringify({ id, variantId })
    });
}
