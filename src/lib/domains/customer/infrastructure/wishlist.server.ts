import { WishlistItemSchema, type WishlistItem } from '../domain/models';
import { postWishlistItem, removeWishlistItem } from '../domain/wishlist-mutations';
import { createDocumentListHandlers } from '$shared/infrastructure/server';

export const wishlistHandlers = createDocumentListHandlers<WishlistItem>({
	type: 'wishlist',
	itemSchema: WishlistItemSchema,
	mutations: {
		post: postWishlistItem,
		remove: removeWishlistItem
	}
});
