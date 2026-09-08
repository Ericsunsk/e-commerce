import { browser } from '$app/environment';
import { STORAGE_KEYS } from '$shared/kernel';
import type { CartItem } from '../domain/models';

export function getGuestCart(): CartItem[] {
	if (!browser) return [];
	try {
		const stored = localStorage.getItem(STORAGE_KEYS.CART);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

export function saveGuestCart(items: CartItem[]): void {
	if (browser) {
		localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
	}
}

export function clearGuestCart(): void {
	if (browser) {
		localStorage.removeItem(STORAGE_KEYS.CART);
	}
}
