import type { CartItem } from '$lib/types';
import { apiClient } from '$lib/api/client';

// We'll treat the API response type here
interface CartResponse {
    items: CartItem[];
    updated?: string;
}

export async function fetchCart(): Promise<CartItem[]> {
    const data = await apiClient<CartResponse>('/api/cart');
    return data.items || [];
}

export async function addToCartAPI(item: CartItem): Promise<CartResponse> {
    return apiClient<CartResponse>('/api/cart', {
        method: 'POST',
        body: JSON.stringify(item)
    });
}

export async function updateCartItemAPI(id: string, variantId: string | undefined, quantity: number): Promise<CartResponse> {
    return apiClient<CartResponse>('/api/cart', {
        method: 'PATCH',
        body: JSON.stringify({ id, variantId, quantity })
    });
}

export async function removeFromCartAPI(id: string, variantId?: string): Promise<CartResponse> {
    return apiClient<CartResponse>('/api/cart', {
        method: 'DELETE',
        body: JSON.stringify({ id, variantId })
    });
}
