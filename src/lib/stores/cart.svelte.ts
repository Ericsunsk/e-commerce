import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { fetchCart, addToCartAPI, updateCartItemAPI, removeFromCartAPI } from "$lib/api/cart";
import { formatCurrency as formatCurrencyUtil, parsePrice } from "$lib/utils/price";
import type { Product, CartItem } from '$lib/types';
import { DEFAULTS } from "$lib/constants";
import { queryKeys } from "$lib/keys";
import { auth } from "./auth.svelte";
import { getContext, setContext } from 'svelte';

// =============================================================================
// Cart Hook (TanStack Query)
// =============================================================================

// Currency configuration
let currencyConfig = $state({ code: DEFAULTS.currencyCode as string, locale: 'en-US' });

export function setCurrencyConfig(code: string, locale: string = 'en-US') {
    currencyConfig = { code, locale };
}

function formatCurrency(amount: number): string {
    return formatCurrencyUtil(amount, {
        currency: currencyConfig.code,
        locale: currencyConfig.locale
    });
}

export function useCart() {
    const client = useQueryClient();

    // 1. Query
    const query = createQuery<CartItem[]>(() => ({
        queryKey: queryKeys.cart(),
        queryFn: fetchCart,
        enabled: auth.isAuthenticated, // Only fetch if logged in
        initialData: [], // Default to empty array
    }));

    // Helper to compute derived state
    const items = $derived(query.data?.map((item: CartItem) => ({
        ...item,
        // UI compatibility: generate composite ID
        cartItemId: `${item.id}-${item.color}-${item.size}`
    })) || []);
    
    const count = $derived(items.reduce((acc: number, item: any) => acc + item.quantity, 0));
    const subtotal = $derived(items.reduce((acc: number, item: any) => acc + ((item.price || 0) * item.quantity), 0));

    // 2. Mutations
    
    // Add Item
    const addMutation = createMutation(() => ({
        mutationFn: addToCartAPI,
        onMutate: async (newItem: CartItem) => {
            await client.cancelQueries({ queryKey: queryKeys.cart() });
            const previousItems = client.getQueryData<CartItem[]>(queryKeys.cart());

            client.setQueryData<CartItem[]>(queryKeys.cart(), (old = []) => {
                const existingIdx = old.findIndex(i => i.id === newItem.id && i.variantId === newItem.variantId);
                if (existingIdx > -1) {
                    const next = [...old];
                    next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + newItem.quantity };
                    return next;
                }
                return [...old, newItem];
            });

            return { previousItems };
        },
        onError: (err: any, newItem: CartItem, context: any) => {
            if (context?.previousItems) {
                client.setQueryData(queryKeys.cart(), context.previousItems);
            }
        },
        onSettled: () => {
            client.invalidateQueries({ queryKey: queryKeys.cart() });
        }
    }));

    // Remove Item
    const removeMutation = createMutation(() => ({
        mutationFn: async ({ id, variantId }: { id: string, variantId?: string }) => {
            return removeFromCartAPI(id, variantId);
        },
        onMutate: async (target: { id: string, variantId?: string }) => {
            await client.cancelQueries({ queryKey: queryKeys.cart() });
            const previousItems = client.getQueryData<CartItem[]>(queryKeys.cart());

            client.setQueryData<CartItem[]>(queryKeys.cart(), (old = []) => {
                return old.filter(i => !(i.id === target.id && i.variantId === target.variantId));
            });

            return { previousItems };
        },
        onError: (err: any, target: any, context: any) => {
            if (context?.previousItems) {
                client.setQueryData(queryKeys.cart(), context.previousItems);
            }
        },
        onSettled: () => {
            client.invalidateQueries({ queryKey: queryKeys.cart() });
        }
    }));

    // Update Quantity
    const updateMutation = createMutation(() => ({
        mutationFn: async ({ id, variantId, quantity }: { id: string, variantId?: string, quantity: number }) => {
            return updateCartItemAPI(id, variantId, quantity);
        },
        onMutate: async ({ id, variantId, quantity }: { id: string, variantId?: string, quantity: number }) => {
            await client.cancelQueries({ queryKey: queryKeys.cart() });
            const previousItems = client.getQueryData<CartItem[]>(queryKeys.cart());

            client.setQueryData<CartItem[]>(queryKeys.cart(), (old = []) => {
                return old.map(i => {
                    if (i.id === id && i.variantId === variantId) {
                        return { ...i, quantity };
                    }
                    return i;
                });
            });

            return { previousItems };
        },
        onError: (err: any, vars: any, context: any) => {
            if (context?.previousItems) {
                client.setQueryData(queryKeys.cart(), context.previousItems);
            }
        },
        onSettled: () => {
            client.invalidateQueries({ queryKey: queryKeys.cart() });
        }
    }));


    // 3. Exposed Interface
    return {
        // State
        get items() { return items; },
        get count() { return count; },
        get subtotal() { return subtotal; },
        get total() { return subtotal; }, // Alias
        get subtotalFormatted() { return formatCurrency(subtotal); },
        get totalFormatted() { return formatCurrency(subtotal); },
        get currencyCode() { return currencyConfig.code; },
        get isLoading() { return query.isLoading; },

        // Actions
        addItem(product: Product, color: string, size: string) {
            const variant = product.variants?.find(v => v.color === color && v.size === size);
            const priceVal = variant?.priceOverride ?? parsePrice(product.price);
            const imageUrl = variant?.image ?? (product.image ?? (product.images?.[0] ?? ''));

            const newItem: CartItem = {
                id: product.id,
                variantId: variant?.id,
                quantity: 1,
                title: product.title,
                price: priceVal,
                image: imageUrl,
                slug: product.id,
                color,
                size,
                stripePriceId: product.stripePriceId
            };

            addMutation.mutate(newItem);
        },

        removeItem(cartItemId: string) {
            // Reverse engineer composite ID
            // Or find item in current list
            const item = items.find(i => i.cartItemId === cartItemId);
            if (!item) return;
            
            removeMutation.mutate({ id: item.id, variantId: item.variantId });
        },

        updateQuantity(cartItemId: string, delta: number) {
            const item = items.find(i => i.cartItemId === cartItemId);
            if (!item) return;

            const newQty = item.quantity + delta;
            if (newQty <= 0) {
                removeMutation.mutate({ id: item.id, variantId: item.variantId });
            } else {
                updateMutation.mutate({ id: item.id, variantId: item.variantId, quantity: newQty });
            }
        },
        
        clear() {
           // Implement clear API if needed
           client.setQueryData(queryKeys.cart(), []);
        }
    };
}
