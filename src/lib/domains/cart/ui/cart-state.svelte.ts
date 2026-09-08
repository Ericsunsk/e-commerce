import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
	fetchCart,
	addToCartAPI,
	updateCartItemAPI,
	removeFromCartAPI
} from '../infrastructure/cart-api.client';
import {
	getGuestCart,
	saveGuestCart
} from '../infrastructure/cart-storage.client';
import {
	mergeCartItemQuantity,
	removeCartItemByIdentity,
	setCartItemQuantityByIdentity,
	type CartItem
} from '../domain/models';
import { formatCurrency, parsePrice, DEFAULTS } from '$shared/kernel';
import { createOptimisticQueryHelpers } from '$shared/infrastructure';
import { auth } from '$domains/customer';

export const CART_QUERY_KEY = ['cart'] as const;

let currencyConfig = $state({ code: DEFAULTS.currencyCode as string, locale: 'en-US' });

export function setCurrencyConfig(code: string, locale = 'en-US') {
	currencyConfig = { code, locale };
}

function formatCartPrice(amount: number): string {
	return formatCurrency(amount, {
		currency: currencyConfig.code,
		locale: currencyConfig.locale
	});
}

export class CartState {
	private client = useQueryClient();
	private cartKey = CART_QUERY_KEY;
	private optimisticHelpers = createOptimisticQueryHelpers<CartItem>(
		this.client,
		this.cartKey
	);

	private query = createQuery<CartItem[]>(() => ({
		queryKey: this.cartKey,
		queryFn: async () => (auth.isAuthenticated ? fetchCart() : getGuestCart())
	}));

	get items(): (CartItem & { cartItemId: string })[] {
		return (
			this.query.data?.map((item: CartItem) => ({
				...item,
				price: parsePrice(item.price),
				cartItemId: `${item.id}-${item.variantId || 'base'}`
			})) || []
		);
	}

	get count(): number {
		return this.items.reduce((acc, item) => acc + item.quantity, 0);
	}

	get subtotal(): number {
		return this.items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
	}

	get total(): number {
		return this.subtotal;
	}

	get subtotalFormatted(): string {
		return formatCartPrice(this.subtotal);
	}

	get totalFormatted(): string {
		return formatCartPrice(this.total);
	}

	get currencyCode(): string {
		return currencyConfig.code;
	}

	get isLoading(): boolean {
		return this.query.isLoading;
	}

	private addMutation = createMutation(() => ({
		...this.optimisticHelpers.commonMutationOptions,
		mutationFn: async (newItem: CartItem) => {
			if (auth.isAuthenticated) return addToCartAPI(newItem);

			const next = mergeCartItemQuantity(getGuestCart(), newItem);
			saveGuestCart(next);
			return { success: true, items: next };
		},
		onMutate: (newItem) => this.optimisticHelpers.performOptimisticUpdate((old) => mergeCartItemQuantity(old, newItem))
	}));

	private removeMutation = createMutation(() => ({
		...this.optimisticHelpers.commonMutationOptions,
		mutationFn: async ({ id, variantId }: { id: string; variantId?: string }) => {
			if (auth.isAuthenticated) return removeFromCartAPI(id, variantId);

			const next = removeCartItemByIdentity(getGuestCart(), { id, variantId });
			saveGuestCart(next);
			return { success: true, items: next };
		},
		onMutate: ({ id, variantId }) =>
			this.optimisticHelpers.performOptimisticUpdate((old) => removeCartItemByIdentity(old, { id, variantId }))
	}));

	private updateMutation = createMutation(() => ({
		...this.optimisticHelpers.commonMutationOptions,
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
			this.optimisticHelpers.performOptimisticUpdate((old) =>
				setCartItemQuantityByIdentity(old, { id, variantId }, quantity)
			)
	}));

	addItem(
		product: {
			id: string;
			title?: string;
			price?: string | number;
			priceValue?: number;
			image?: string;
			images?: string[];
			stripePriceId?: string;
			variants?: Array<{ id: string; color?: string; size?: string; image?: string; stockQuantity?: number }>;
			hasVariants?: boolean;
		},
		color: string,
		size: string
	) {
		const variant = product.variants?.find((v) => v.color === color && v.size === size);
		const priceVal = parsePrice(product.price) || parsePrice(product.priceValue);
		const imageUrl = variant?.image ?? product.image ?? product.images?.[0] ?? '';

		this.addMutation.mutate({
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
	}

	addRawItem(item: CartItem) {
		this.addMutation.mutate(item);
	}

	removeItem(cartItemId?: string) {
		if (!cartItemId) return;
		const item = this.items.find((i) => i.cartItemId === cartItemId);
		if (item) this.removeMutation.mutate({ id: item.id, variantId: item.variantId });
	}

	updateQuantity(cartItemId: string | undefined, delta: number) {
		if (!cartItemId) return;
		const item = this.items.find((i) => i.cartItemId === cartItemId);
		if (!item) return;

		const newQty = item.quantity + delta;
		newQty <= 0
			? this.removeMutation.mutate({ id: item.id, variantId: item.variantId })
			: this.updateMutation.mutate({ id: item.id, variantId: item.variantId, quantity: newQty });
	}

	clear() {
		if (!auth.isAuthenticated) saveGuestCart([]);
		this.client.setQueryData(this.cartKey, []);
	}
}

export function useCart(): CartState {
	return new CartState();
}
