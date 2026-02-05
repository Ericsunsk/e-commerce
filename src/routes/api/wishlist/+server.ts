import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/server/api-handler';
import { z } from 'zod';
import { withAdmin } from '$lib/server/admin';
import { WishlistItemSchema, type WishlistItem } from '$lib/types';
import {
	getUserListRecordWithClient,
	upsertUserListItemsWithClient,
	updateUserListItemsWithClient
} from '$lib/server/user-lists';

const wishlistDeleteSchema = z.object({
	id: z.string().min(1),
	variantId: z.string().optional()
});

export const GET: RequestHandler = apiHandler(async ({ locals }) => {
	if (!locals.user) return { items: [] };
	const userId = locals.user.id;

	return withAdmin(async (pb) => {
		const wishlist = await getUserListRecordWithClient<WishlistItem>(pb, userId, 'wishlist');
		return { items: wishlist?.items ?? [] };
	});
});

export const POST: RequestHandler = apiHandler(
	async ({ request, locals }) => {
		const parsed = WishlistItemSchema.safeParse(await request.json());
		if (!parsed.success) {
			throw { status: 400, message: parsed.error.issues[0]?.message ?? 'Invalid item' };
		}

		const newItem = parsed.data;
		const userId = locals.user!.id;

		return withAdmin(async (pb) => {
			const wishlist = await getUserListRecordWithClient<WishlistItem>(pb, userId, 'wishlist');
			const items: WishlistItem[] = wishlist?.items ? [...wishlist.items] : [];

			const exists = items.some((i) => i.id === newItem.id && i.variantId === newItem.variantId);
			if (!exists) {
				items.push(newItem);
				await upsertUserListItemsWithClient(pb, {
					userId,
					type: 'wishlist',
					items,
					recordId: wishlist?.id
				});
			}

			return { success: true, items };
		});
	},
	{ auth: true }
);

export const DELETE: RequestHandler = apiHandler(
	async ({ request, locals }) => {
		const parsed = wishlistDeleteSchema.safeParse(await request.json());
		if (!parsed.success) {
			throw { status: 400, message: parsed.error.issues[0]?.message ?? 'Invalid payload' };
		}

		const { id, variantId } = parsed.data;
		const userId = locals.user!.id;

		return withAdmin(async (pb) => {
			const wishlist = await getUserListRecordWithClient<WishlistItem>(pb, userId, 'wishlist');
			if (!wishlist) return { success: true, items: [] };

			const items: WishlistItem[] = wishlist.items || [];

			const hasVariant = typeof variantId === 'string' && variantId.length > 0;
			const newItems = items.filter((i) => {
				if (i.id !== id) return true;
				// If variantId not provided, remove ALL items matching product id
				if (!hasVariant) return false;
				return i.variantId !== variantId;
			});

			if (newItems.length !== items.length) {
				await updateUserListItemsWithClient(pb, {
					recordId: wishlist.id,
					items: newItems,
					ignoreNotFound: true
				});
			}

			return { success: true, items: newItems };
		});
	},
	{ auth: true }
);
