import { browser } from '$app/environment';
import { STORAGE_KEYS } from '$shared/kernel';
import type { WishlistItem } from '../domain/models';

export function getGuestWishlist(): WishlistItem[] {
	if (!browser) return [];
	try {
		const stored = localStorage.getItem(STORAGE_KEYS.WISHLIST);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

export function saveGuestWishlist(items: WishlistItem[]): void {
	if (browser) {
		localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(items));
	}
}

export function clearGuestWishlist(): void {
	if (browser) {
		localStorage.removeItem(STORAGE_KEYS.WISHLIST);
	}
}
