import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
	fetchWishlist,
	addToWishlistAPI,
	removeFromWishlistAPI
} from '../infrastructure/wishlist-api.client';
import {
	getGuestWishlist,
	saveGuestWishlist,
	clearGuestWishlist
} from '../infrastructure/wishlist-storage.client';
import {
	postWishlistItem,
	removeWishlistItem,
	diffWishlistLists
} from '../domain/wishlist-mutations';
import { parsePrice } from '$shared/kernel';
import { createOptimisticQueryHelpers } from '$shared/infrastructure';
import { auth } from './auth-state.svelte';
import { registerPostLoginTask } from '../domain/post-login-sync';
import type { WishlistItem } from '../domain/models';

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

export class WishlistState {
	private client = useQueryClient();
	private wishlistKey = WISHLIST_QUERY_KEY;
	private optimisticHelpers = createOptimisticQueryHelpers<WishlistItem>(
		this.client,
		this.wishlistKey
	);
	private static postLoginTaskRegistered = false;

	constructor() {
		// First instance owns the post-login sync; all instances share the query cache.
		if (!WishlistState.postLoginTaskRegistered) {
			WishlistState.postLoginTaskRegistered = true;
			registerPostLoginTask(() => this.syncGuestWishlistOnAuth());
		}
	}

	private query = createQuery<WishlistItem[]>(() => ({
		queryKey: this.wishlistKey,
		queryFn: async () => (auth.isAuthenticated ? fetchWishlist() : getGuestWishlist())
	}));

	private addMutation = createMutation(() => ({
		...this.optimisticHelpers.commonMutationOptions,
		mutationFn: async (newItem: WishlistItem) => {
			if (auth.isAuthenticated) return addToWishlistAPI(newItem);

			const next = postWishlistItem(getGuestWishlist(), newItem).items;
			saveGuestWishlist(next);
			return { success: true, items: next };
		},
		onMutate: (newItem: WishlistItem) =>
			this.optimisticHelpers.performOptimisticUpdate((old) => {
				if (old.some((i) => i.id === newItem.id && i.variantId === newItem.variantId)) return old;
				return [...old, newItem];
			})
	}));

	private removeMutation = createMutation(() => ({
		...this.optimisticHelpers.commonMutationOptions,
		mutationFn: async ({ id, variantId }: { id: string; variantId?: string }) => {
			if (auth.isAuthenticated) return removeFromWishlistAPI(id, variantId);

			const next = removeWishlistItem(getGuestWishlist(), { id, variantId });
			saveGuestWishlist(next);
			return { success: true, items: next };
		},
		onMutate: ({ id, variantId }: { id: string; variantId?: string }) =>
			this.optimisticHelpers.performOptimisticUpdate((old) =>
				removeWishlistItem(old, { id, variantId })
			)
	}));

	get items(): WishlistItem[] {
		return this.query.data || [];
	}

	get count(): number {
		return this.items.length;
	}

	get isLoading(): boolean {
		return this.query.isLoading;
	}

	toggle(product: {
		id: string;
		variantId?: string;
		title?: string;
		price?: string | number;
		image?: string;
		stripePriceId?: string;
	}): void {
		const exists = this.items.some((i) => i.id === product.id && i.variantId === product.variantId);
		if (exists) {
			this.removeMutation.mutate({ id: product.id, variantId: product.variantId });
		} else {
			const newItem: WishlistItem = {
				id: product.id,
				variantId: product.variantId,
				title: product.title,
				price: typeof product.price === 'number' ? product.price : parsePrice(product.price),
				image: product.image,
				slug: product.id,
				stripePriceId: product.stripePriceId
			};
			this.addMutation.mutate(newItem);
		}
	}

	has(id: string, variantId?: string): boolean {
		return this.items.some(
			(i) => i.id === id && (variantId === undefined || i.variantId === variantId)
		);
	}

	remove(id: string, variantId?: string): void {
		this.removeMutation.mutate({ id, variantId });
	}

	clearLocal(): void {
		this.client.setQueryData(this.wishlistKey, []);
	}

	/**
	 * Transfer the guest `localStorage` wishlist into the account on login.
	 * Only missing id+variant pairs are POSTed (deduplicated); guest storage
	 * is cleared on full success and the cache refreshed with the merged
	 * server result. Failed lines stay local for a later retry.
	 */
	async syncGuestWishlistOnAuth(): Promise<void> {
		if (!auth.isAuthenticated) return;

		const guest = getGuestWishlist();
		if (guest.length === 0) {
			await this.client.invalidateQueries({ queryKey: this.wishlistKey });
			return;
		}

		let remote: WishlistItem[] = [];
		try {
			remote = await fetchWishlist();
		} catch {
			return;
		}
		const missing = diffWishlistLists(remote, guest);
		const results = await Promise.allSettled(missing.map((item) => addToWishlistAPI(item)));
		const failedIds = new Set(
			missing.filter((_, index) => results[index].status === 'rejected').map((item) => item.id)
		);
		if (failedIds.size === 0) {
			clearGuestWishlist();
		} else {
			saveGuestWishlist(guest.filter((item) => failedIds.has(item.id)));
		}
		await this.client.invalidateQueries({ queryKey: this.wishlistKey });
	}
}

export function useWishlist(): WishlistState {
	return new WishlistState();
}
