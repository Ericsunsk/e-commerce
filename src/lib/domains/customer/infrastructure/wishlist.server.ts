import { WishlistItemSchema, type WishlistItem } from '../domain/models';
import { createUserListHandlers } from '$shared/infrastructure/server';

export const wishlistHandlers = createUserListHandlers<WishlistItem>({
	type: 'wishlist',
	itemSchema: WishlistItemSchema,
	postMode: 'appendIfMissing',
	deleteMode: 'removeAllWhenVariantMissing'
});
