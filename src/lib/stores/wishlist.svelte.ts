import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { fetchWishlist, addToWishlistAPI, removeFromWishlistAPI } from "$lib/api/wishlist";
import { parsePrice } from "$lib/utils/price";
import type { Product } from '$lib/types';
import { queryKeys } from "$lib/keys";
import { auth } from "./auth.svelte";

// =============================================================================
// Wishlist Hook (TanStack Query)
// =============================================================================

// Define internal item type to match API
interface WishlistItem {
    id: string;
    variantId?: string;
    title?: string;
    price?: number;
    image?: string;
    slug?: string;
    stripePriceId?: string;
}

export function useWishlist() {
    const client = useQueryClient();

    // 1. Query
    const query = createQuery<WishlistItem[]>(() => ({
        queryKey: queryKeys.wishlist(),
        queryFn: fetchWishlist,
        enabled: auth.isAuthenticated,
        initialData: [],
    }));

    const items = $derived(query.data || []);
    const count = $derived(items.length);

    // 2. Mutations
    const addMutation = createMutation(() => ({
        mutationFn: addToWishlistAPI,
        onMutate: async (newItem: WishlistItem) => {
            await client.cancelQueries({ queryKey: queryKeys.wishlist() });
            const previousItems = client.getQueryData<WishlistItem[]>(queryKeys.wishlist());

            client.setQueryData<WishlistItem[]>(queryKeys.wishlist(), (old = []) => {
                if (old.some(i => i.id === newItem.id)) return old;
                return [...old, newItem];
            });

            return { previousItems };
        },
        onError: (err: any, newItem: WishlistItem, context: any) => {
            if (context?.previousItems) {
                client.setQueryData(queryKeys.wishlist(), context.previousItems);
            }
        },
        onSettled: () => {
            client.invalidateQueries({ queryKey: queryKeys.wishlist() });
        }
    }));

    const removeMutation = createMutation(() => ({
        mutationFn: async (id: string) => {
            return removeFromWishlistAPI(id);
        },
        onMutate: async (id: string) => {
            await client.cancelQueries({ queryKey: queryKeys.wishlist() });
            const previousItems = client.getQueryData<WishlistItem[]>(queryKeys.wishlist());

            client.setQueryData<WishlistItem[]>(queryKeys.wishlist(), (old = []) => {
                return old.filter(i => i.id !== id);
            });

            return { previousItems };
        },
        onError: (err: any, id: string, context: any) => {
            if (context?.previousItems) {
                client.setQueryData(queryKeys.wishlist(), context.previousItems);
            }
        },
        onSettled: () => {
            client.invalidateQueries({ queryKey: queryKeys.wishlist() });
        }
    }));

    return {
        get items() { return items; },
        get count() { return count; },
        get isLoading() { return query.isLoading; },

        toggle(product: Product) {
            const exists = items.some(i => i.id === product.id);
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
            client.setQueryData(queryKeys.wishlist(), []);
        }
    };
}
