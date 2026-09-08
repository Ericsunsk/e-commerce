import { CartItemSchema, type CartItem } from '../domain/models';
import { createUserListHandlers } from '$shared/infrastructure/server';

export const cartHandlers = createUserListHandlers<CartItem>({
	type: 'cart',
	itemSchema: CartItemSchema,
	postMode: 'mergeQuantity',
	deleteMode: 'exactVariant',
	enablePatchQuantity: true
});
