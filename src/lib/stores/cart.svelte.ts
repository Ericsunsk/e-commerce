import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { fetchCart, addToCartAPI, updateCartItemAPI, removeFromCartAPI } from "$lib/api/cart";
import { formatCurrency as formatCurrencyUtil, parsePrice } from "$lib/utils/price";
import type { Product, CartItem } from '$lib/types';
import { DEFAULTS, STORAGE_KEYS } from "$lib/constants";
import { queryKeys } from "$lib/keys";
import { auth } from "./auth.svelte";
import { browser } from '$app/environment';

// =============================================================================
// Cart Hook (TanStack Query) - Refactored for Simplicity
// =============================================================================

// Currency Config
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

// Guest Cart Persistence
function getGuestCart(): CartItem[] {
    if (!browser) return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.CART);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
}

function saveGuestCart(items: CartItem[]) {
    if (browser) localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
}

export function useCart() {
    const client = useQueryClient();
    const cartKey = queryKeys.cart();

    // 1. Query
    const query = createQuery<CartItem[]>(() => ({
        queryKey: cartKey,
        queryFn: async () => auth.isAuthenticated ? fetchCart() : getGuestCart(),
        // initialData: [], // Removed to force fetch on mount
    }));

    // Derived State
    const items = $derived(query.data?.map((item: CartItem) => ({
        ...item,
        price: parsePrice(item.price), // Ensure price is always a number
        cartItemId: `${item.id}-${item.variantId || 'base'}`
    })) || []);
    
    const count = $derived(items.reduce((acc, item) => acc + item.quantity, 0));
    const subtotal = $derived(items.reduce((acc, item) => acc + (item.price * item.quantity), 0));

    // 2. Optimized Mutation Helpers
    const performOptimisticUpdate = async (updateFn: (old: CartItem[]) => CartItem[]) => {
        await client.cancelQueries({ queryKey: cartKey });
        const previousItems = client.getQueryData<CartItem[]>(cartKey);
        client.setQueryData<CartItem[]>(cartKey, (old = []) => updateFn(old));
        return { previousItems };
    };

    const commonMutationOptions = {
        onError: (_err: any, _vars: any, context: any) => {
            if (context?.previousItems) client.setQueryData(cartKey, context.previousItems);
        },
        onSettled: () => client.invalidateQueries({ queryKey: cartKey })
    };

    // 3. Mutations
    // Add Item
    const addMutation = createMutation(() => ({
        ...commonMutationOptions,
        mutationFn: async (newItem: CartItem) => {
            if (auth.isAuthenticated) return addToCartAPI(newItem);
            
            const next = [...getGuestCart()];
            const idx = next.findIndex(i => i.id === newItem.id && i.variantId === newItem.variantId);
            idx > -1 
                ? next[idx] = { ...next[idx], quantity: next[idx].quantity + newItem.quantity }
                : next.push(newItem);
            
            saveGuestCart(next);
            return { success: true, items: next };
        },
        onMutate: (newItem) => performOptimisticUpdate((old) => {
            const next = [...old];
            const idx = next.findIndex(i => i.id === newItem.id && i.variantId === newItem.variantId);
            idx > -1 
                ? next[idx] = { ...next[idx], quantity: next[idx].quantity + newItem.quantity }
                : next.push(newItem);
            return next;
        })
    }));

    // Remove Item
    const removeMutation = createMutation(() => ({
        ...commonMutationOptions,
        mutationFn: async ({ id, variantId }: { id: string, variantId?: string }) => {
            if (auth.isAuthenticated) return removeFromCartAPI(id, variantId);

            const next = getGuestCart().filter(i => !(i.id === id && i.variantId === variantId));
            saveGuestCart(next);
            return { success: true, items: next };
        },
        onMutate: ({ id, variantId }) => performOptimisticUpdate((old) => 
            old.filter(i => !(i.id === id && i.variantId === variantId))
        )
    }));

    // Update Quantity
    const updateMutation = createMutation(() => ({
        ...commonMutationOptions,
        mutationFn: async ({ id, variantId, quantity }: { id: string, variantId?: string, quantity: number }) => {
            if (auth.isAuthenticated) return updateCartItemAPI(id, variantId, quantity);

            const next = getGuestCart().map(i => 
                (i.id === id && i.variantId === variantId) ? { ...i, quantity } : i
            );
            saveGuestCart(next);
            return { success: true, items: next };
        },
        onMutate: ({ id, variantId, quantity }) => performOptimisticUpdate((old) => 
            old.map(i => (i.id === id && i.variantId === variantId) ? { ...i, quantity } : i)
        )
    }));

    // 4. Interface
    return {
        get items() { return items; },
        get count() { return count; },
        get subtotal() { return subtotal; },
        get total() { return subtotal; },
        get subtotalFormatted() { return formatCurrency(subtotal); },
        get totalFormatted() { return formatCurrency(subtotal); },
        get currencyCode() { return currencyConfig.code; },
        get isLoading() { return query.isLoading; },

        addItem(product: Product, color: string, size: string) {
            const variant = product.variants?.find(v => v.color === color && v.size === size);
            const priceVal = variant?.priceOverride ?? parsePrice(product.price);
            const imageUrl = variant?.image ?? (product.image ?? (product.images?.[0] ?? ''));

            addMutation.mutate({
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
            });
        },

        removeItem(cartItemId: string) {
            const item = items.find(i => i.cartItemId === cartItemId);
            if (item) removeMutation.mutate({ id: item.id, variantId: item.variantId });
        },

        updateQuantity(cartItemId: string, delta: number) {
            const item = items.find(i => i.cartItemId === cartItemId);
            if (!item) return;

            const newQty = item.quantity + delta;
            newQty <= 0 
                ? removeMutation.mutate({ id: item.id, variantId: item.variantId })
                : updateMutation.mutate({ id: item.id, variantId: item.variantId, quantity: newQty });
        },
        
        clear() {
           if (!auth.isAuthenticated) saveGuestCart([]);
           client.setQueryData(cartKey, []);
        }
    };
}
