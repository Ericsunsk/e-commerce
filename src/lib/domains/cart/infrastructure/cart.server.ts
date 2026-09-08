import { CartItemSchema, type CartItem } from '../domain/models';
import { postCartItem, patchCartItemQuantity, removeCartItem } from '../domain/list-mutations';
import { createDocumentListHandlers } from '$shared/infrastructure/server';

export const cartHandlers = createDocumentListHandlers<CartItem>({
	type: 'cart',
	itemSchema: CartItemSchema,
	mutations: {
		post: postCartItem,
		patch: patchCartItemQuantity,
		remove: removeCartItem
	},
	missingListMessage: 'Cart not found'
});
