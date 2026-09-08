import { z } from 'zod';

export const CartItemSchema = z.object({
	id: z.string(), // Product ID
	variantId: z.string().optional(),
	quantity: z.number().min(1),

	// Snapshot data (for UI display without refetching product)
	title: z.string().optional(),
	price: z.number().optional(),
	image: z.string().optional(),
	slug: z.string().optional(),

	color: z.string().optional(),
	size: z.string().optional(),

	stripePriceId: z.string().optional(),

	// Computed locally
	cartItemId: z.string().optional()
});

export type CartItem = z.infer<typeof CartItemSchema>;

export interface CartSummary {
	items: CartItem[];
	itemCount: number;
	subtotal: number;
	total: number;
	currencyCode: string;
}

export type CartItemIdentity = Pick<CartItem, 'id' | 'variantId'>;

export function isSameCartItem(a: CartItemIdentity, b: CartItemIdentity): boolean {
	return a.id === b.id && a.variantId === b.variantId;
}

export function generateCartItemId(item: CartItemIdentity): string {
	return `${item.id}-${item.variantId || 'base'}`;
}

export function mergeCartItemQuantity(items: CartItem[], newItem: CartItem): CartItem[] {
	const next = [...items];
	const index = next.findIndex((item) => isSameCartItem(item, newItem));

	if (index > -1) {
		next[index] = {
			...next[index],
			quantity: next[index].quantity + newItem.quantity
		};
	} else {
		next.push({
			...newItem,
			cartItemId: newItem.cartItemId || generateCartItemId(newItem)
		});
	}

	return next;
}

export function removeCartItemByIdentity(items: CartItem[], target: CartItemIdentity): CartItem[] {
	return items.filter((item) => !isSameCartItem(item, target));
}

export function setCartItemQuantityByIdentity(
	items: CartItem[],
	target: CartItemIdentity,
	quantity: number
): CartItem[] {
	if (quantity <= 0) {
		return removeCartItemByIdentity(items, target);
	}
	return items.map((item) => (isSameCartItem(item, target) ? { ...item, quantity } : item));
}

export function calculateCartSummary(items: CartItem[], currencyCode = 'USD'): CartSummary {
	const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
	const subtotal = items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
	return {
		items,
		itemCount,
		subtotal,
		total: subtotal,
		currencyCode
	};
}
