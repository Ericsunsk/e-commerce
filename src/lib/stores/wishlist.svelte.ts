import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { fetchWishlist, addToWishlistAPI, removeFromWishlistAPI } from '$lib/api/wishlist';
import { parsePrice } from '$lib/utils/price';
import type { Product } from '$lib/types';
import type { WishlistItem } from '$lib/types';
import { queryKeys } from '$lib/keys';
import { auth } from './auth.svelte';
import { createOptimisticQueryHelpers } from './query-optimistic';

// =============================================================================
// Wishlist Hook (TanStack Query)
// =============================================================================

export function useWishlist() {
	const client = useQueryClient();
	const wishlistKey = queryKeys.wishlist();
	const { performOptimisticUpdate, commonMutationOptions } =
		createOptimisticQueryHelpers<WishlistItem>(client, wishlistKey);

	// 1. Query
	const query = createQuery<WishlistItem[]>(() => ({
		queryKey: wishlistKey,
		queryFn: fetchWishlist,
		enabled: auth.isAuthenticated,
		initialData: []
	}));

	const items = $derived(query.data || []);
	const count = $derived(items.length);

	// 2. Mutations
	const addMutation = createMutation(() => ({
		...commonMutationOptions,
		mutationFn: addToWishlistAPI,
		onMutate: (newItem: WishlistItem) =>
			performOptimisticUpdate((old) => {
				if (old.some((i) => i.id === newItem.id)) return old;
				return [...old, newItem];
			})
	}));

	const removeMutation = createMutation(() => ({
		...commonMutationOptions,
		mutationFn: (id: string) => removeFromWishlistAPI(id),
		onMutate: (id: string) => performOptimisticUpdate((old) => old.filter((i) => i.id !== id))
	}));

	return {
		get items() {
			return items;
		},
		get count() {
			return count;
		},
		get isLoading() {
			return query.isLoading;
		},

		toggle(product: Product) {
			const exists = items.some((i) => i.id === product.id);
			if (exists) {
				removeMutation.mutate(product.id);
			} else {
				const newItem: WishlistItem = {
					id: product.id,
					title: product.title,
					price: parsePrice(product.price),
					image: product.image,
					slug: product.id,
					stripePriceId: product.stripePriceId
				};
				addMutation.mutate(newItem);
			}
		},

		has(id: string) {
			return items.some((i) => i.id === id);
		},

		remove(id: string) {
			removeMutation.mutate(id);
		},

		clearLocal() {
			client.setQueryData(wishlistKey, []);
		}
	};
}
