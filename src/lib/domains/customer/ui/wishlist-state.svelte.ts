import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
	fetchWishlist,
	addToWishlistAPI,
	removeFromWishlistAPI
} from '../infrastructure/wishlist-api.client';
import { parsePrice } from '$shared/kernel';
import { createOptimisticQueryHelpers } from '$shared/infrastructure';
import { auth } from './auth-state.svelte';
import type { WishlistItem } from '../domain/models';

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

export class WishlistState {
	private client = useQueryClient();
	private wishlistKey = WISHLIST_QUERY_KEY;
	private optimisticHelpers = createOptimisticQueryHelpers<WishlistItem>(
		this.client,
		this.wishlistKey
	);

	private query = createQuery<WishlistItem[]>(() => ({
		queryKey: this.wishlistKey,
		queryFn: fetchWishlist,
		enabled: auth.isAuthenticated,
		initialData: []
	}));

	private addMutation = createMutation(() => ({
		...this.optimisticHelpers.commonMutationOptions,
		mutationFn: addToWishlistAPI,
		onMutate: (newItem: WishlistItem) =>
			this.optimisticHelpers.performOptimisticUpdate((old) => {
				if (old.some((i) => i.id === newItem.id)) return old;
				return [...old, newItem];
			})
	}));

	private removeMutation = createMutation(() => ({
		...this.optimisticHelpers.commonMutationOptions,
		mutationFn: (id: string) => removeFromWishlistAPI(id),
		onMutate: (id: string) =>
			this.optimisticHelpers.performOptimisticUpdate((old) => old.filter((i) => i.id !== id))
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
		title?: string;
		price?: string | number;
		image?: string;
		stripePriceId?: string;
	}): void {
		const exists = this.items.some((i) => i.id === product.id);
		if (exists) {
			this.removeMutation.mutate(product.id);
		} else {
			const newItem: WishlistItem = {
				id: product.id,
				title: product.title,
				price: typeof product.price === 'number' ? product.price : parsePrice(product.price),
				image: product.image,
				slug: product.id,
				stripePriceId: product.stripePriceId
			};
			this.addMutation.mutate(newItem);
		}
	}

	has(id: string): boolean {
		return this.items.some((i) => i.id === id);
	}

	remove(id: string): void {
		this.removeMutation.mutate(id);
	}

	clearLocal(): void {
		this.client.setQueryData(this.wishlistKey, []);
	}
}

export function useWishlist(): WishlistState {
	return new WishlistState();
}
