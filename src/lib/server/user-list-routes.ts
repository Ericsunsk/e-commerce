import { CartItemSchema, type CartItem, WishlistItemSchema, type WishlistItem } from '$lib/types';
import { createUserListHandlers } from '$lib/server/user-list-handler';

export const cartHandlers = createUserListHandlers<CartItem>({
	type: 'cart',
	itemSchema: CartItemSchema,
	postMode: 'mergeQuantity',
	deleteMode: 'exactVariant',
	enablePatchQuantity: true
});

export const wishlistHandlers = createUserListHandlers<WishlistItem>({
	type: 'wishlist',
	itemSchema: WishlistItemSchema,
	postMode: 'appendIfMissing',
	deleteMode: 'removeAllWhenVariantMissing'
});
