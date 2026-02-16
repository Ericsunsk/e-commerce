import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { fetchCart, addToCartAPI, updateCartItemAPI, removeFromCartAPI } from '$lib/api/cart';
import { formatCurrency as formatCurrencyUtil, parsePrice } from '$lib/utils/price';
import type { Product, CartItem } from '$lib/types';
import { DEFAULTS, STORAGE_KEYS } from '$lib/constants';
import { queryKeys } from '$lib/keys';
import { auth } from './auth.svelte';
import { createOptimisticQueryHelpers } from './query-optimistic';
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
	} catch {
		return [];
	}
}

function saveGuestCart(items: CartItem[]) {
	if (browser) localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
}

type CartItemIdentity = Pick<CartItem, 'id' | 'variantId'>;

function isSameCartItem(item: CartItemIdentity, target: CartItemIdentity): boolean {
	return item.id === target.id && item.variantId === target.variantId;
}

function mergeCartItemQuantity(items: CartItem[], newItem: CartItem): CartItem[] {
	const next = [...items];
	const index = next.findIndex((item) => isSameCartItem(item, newItem));

	if (index > -1) {
		next[index] = {
			...next[index],
			quantity: next[index].quantity + newItem.quantity
		};
	} else {
		next.push(newItem);
	}

	return next;
}

function removeCartItemByIdentity(items: CartItem[], target: CartItemIdentity): CartItem[] {
	return items.filter((item) => !isSameCartItem(item, target));
}

function setCartItemQuantityByIdentity(
	items: CartItem[],
	target: CartItemIdentity,
	quantity: number
): CartItem[] {
	return items.map((item) => (isSameCartItem(item, target) ? { ...item, quantity } : item));
}

export function useCart() {
	const client = useQueryClient();
	const cartKey = queryKeys.cart();
	const { performOptimisticUpdate, commonMutationOptions } = createOptimisticQueryHelpers<CartItem>(
		client,
		cartKey
	);

	// 1. Query
	const query = createQuery<CartItem[]>(() => ({
		queryKey: cartKey,
		queryFn: async () => (auth.isAuthenticated ? fetchCart() : getGuestCart())
		// initialData: [], // Removed to force fetch on mount
	}));

	// Derived State
	const items = $derived(
		query.data?.map((item: CartItem) => ({
			...item,
			price: parsePrice(item.price), // Ensure price is always a number
			cartItemId: `${item.id}-${item.variantId || 'base'}`
		})) || []
	);

	const count = $derived(items.reduce((acc, item) => acc + item.quantity, 0));
	const subtotal = $derived(items.reduce((acc, item) => acc + item.price * item.quantity, 0));

	// 2. Mutations
	// Add Item
	const addMutation = createMutation(() => ({
		...commonMutationOptions,
		mutationFn: async (newItem: CartItem) => {
			if (auth.isAuthenticated) return addToCartAPI(newItem);

			const next = mergeCartItemQuantity(getGuestCart(), newItem);
			saveGuestCart(next);
			return { success: true, items: next };
		},
		onMutate: (newItem) => performOptimisticUpdate((old) => mergeCartItemQuantity(old, newItem))
	}));

	// Remove Item
	const removeMutation = createMutation(() => ({
		...commonMutationOptions,
		mutationFn: async ({ id, variantId }: { id: string; variantId?: string }) => {
			if (auth.isAuthenticated) return removeFromCartAPI(id, variantId);

			const next = removeCartItemByIdentity(getGuestCart(), { id, variantId });
			saveGuestCart(next);
			return { success: true, items: next };
		},
		onMutate: ({ id, variantId }) =>
			performOptimisticUpdate((old) => removeCartItemByIdentity(old, { id, variantId }))
	}));

	// Update Quantity
	const updateMutation = createMutation(() => ({
		...commonMutationOptions,
		mutationFn: async ({
			id,
			variantId,
			quantity
		}: {
			id: string;
			variantId?: string;
			quantity: number;
		}) => {
			if (auth.isAuthenticated) return updateCartItemAPI(id, variantId, quantity);

			const next = setCartItemQuantityByIdentity(getGuestCart(), { id, variantId }, quantity);
			saveGuestCart(next);
			return { success: true, items: next };
		},
		onMutate: ({ id, variantId, quantity }) =>
			performOptimisticUpdate((old) =>
				setCartItemQuantityByIdentity(old, { id, variantId }, quantity)
			)
	}));

	// 3. Interface
	return {
		get items() {
			return items;
		},
		get count() {
			return count;
		},
		get subtotal() {
			return subtotal;
		},
		get total() {
			return subtotal;
		},
		get subtotalFormatted() {
			return formatCurrency(subtotal);
		},
		get totalFormatted() {
			return formatCurrency(subtotal);
		},
		get currencyCode() {
			return currencyConfig.code;
		},
		get isLoading() {
			return query.isLoading;
		},

		addItem(product: Product, color: string, size: string) {
			const variant = product.variants?.find((v) => v.color === color && v.size === size);
			const variantPrice = parsePrice(variant?.priceOverride);
			const basePrice = parsePrice(product.price) || parsePrice(product.priceValue);
			const priceVal = variantPrice > 0 ? variantPrice : basePrice;
			const imageUrl = variant?.image ?? product.image ?? product.images?.[0] ?? '';

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

		addRawItem(item: CartItem) {
			addMutation.mutate(item);
		},

		removeItem(cartItemId: string) {
			const item = items.find((i) => i.cartItemId === cartItemId);
			if (item) removeMutation.mutate({ id: item.id, variantId: item.variantId });
		},

		updateQuantity(cartItemId: string, delta: number) {
			const item = items.find((i) => i.cartItemId === cartItemId);
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
