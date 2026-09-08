import { apiClient } from '$shared/infrastructure';
import type { CartItem } from '../domain/models';

export interface CartResponse {
	items: CartItem[];
}

const CART_ENDPOINT = '/api/cart' as const;

export async function fetchCart(): Promise<CartItem[]> {
	const data = await apiClient<CartResponse>(CART_ENDPOINT);
	return data.items || [];
}

export async function addToCartAPI(item: CartItem): Promise<CartResponse> {
	return apiClient<CartResponse>(CART_ENDPOINT, {
		method: 'POST',
		body: JSON.stringify(item)
	});
}

export async function updateCartItemAPI(
	id: string,
	variantId: string | undefined,
	quantity: number
): Promise<CartResponse> {
	return apiClient<CartResponse>(CART_ENDPOINT, {
		method: 'PATCH',
		body: JSON.stringify({ id, variantId, quantity })
	});
}

export async function removeFromCartAPI(id: string, variantId?: string): Promise<CartResponse> {
	return apiClient<CartResponse>(CART_ENDPOINT, {
		method: 'DELETE',
		body: JSON.stringify({ id, variantId })
	});
}
