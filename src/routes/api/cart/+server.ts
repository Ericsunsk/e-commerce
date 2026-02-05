import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/server/api-handler';
import { z } from 'zod';
import { withAdmin } from '$lib/server/admin';
import { CartItemSchema, type CartItem } from '$lib/types';
import {
	getUserListRecordWithClient,
	upsertUserListItemsWithClient,
	updateUserListItemsWithClient
} from '$lib/server/user-lists';

const cartPatchSchema = z.object({
	id: z.string().min(1),
	variantId: z.string().optional(),
	quantity: z.number()
});

const cartDeleteSchema = z.object({
	id: z.string().min(1),
	variantId: z.string().optional()
});

export const GET: RequestHandler = apiHandler(async ({ locals }) => {
	if (!locals.user) return { items: [] };
	const userId = locals.user.id;

	return withAdmin(async (pb) => {
		const cart = await getUserListRecordWithClient<CartItem>(pb, userId, 'cart');
		return {
			items: cart?.items ?? []
		};
	});
});

export const POST: RequestHandler = apiHandler(
	async ({ request, locals }) => {
		const parsed = CartItemSchema.safeParse(await request.json());
		if (!parsed.success) {
			throw { status: 400, message: parsed.error.issues[0]?.message ?? 'Invalid item' };
		}

		const newItem = parsed.data;
		const userId = locals.user!.id; // auth: true

		return withAdmin(async (pb) => {
			const cart = await getUserListRecordWithClient<CartItem>(pb, userId, 'cart');
			const items: CartItem[] = cart?.items ? [...cart.items] : [];

			const existingIndex = items.findIndex(
				(i) => i.id === newItem.id && i.variantId === newItem.variantId
			);

			if (existingIndex > -1) {
				items[existingIndex] = {
					...items[existingIndex],
					quantity: items[existingIndex].quantity + newItem.quantity
				};
			} else {
				items.push(newItem);
			}

			await upsertUserListItemsWithClient(pb, {
				userId,
				type: 'cart',
				items,
				recordId: cart?.id
			});

			return { success: true, items };
		});
	},
	{ auth: true }
);

export const PATCH: RequestHandler = apiHandler(
	async ({ request, locals }) => {
		const parsed = cartPatchSchema.safeParse(await request.json());
		if (!parsed.success) {
			throw { status: 400, message: parsed.error.issues[0]?.message ?? 'Invalid payload' };
		}

		const { id, variantId, quantity } = parsed.data;
		const userId = locals.user!.id;

		return withAdmin(async (pb) => {
			const cart = await getUserListRecordWithClient<CartItem>(pb, userId, 'cart');
			if (!cart) throw { status: 404, message: 'Cart not found' };

			const items: CartItem[] = cart.items ? [...cart.items] : [];
			const index = items.findIndex((i) => i.id === id && i.variantId === variantId);
			if (index === -1) throw { status: 404, message: 'Item not found in cart' };

			if (quantity <= 0) {
				items.splice(index, 1);
			} else {
				items[index] = { ...items[index], quantity };
			}

			await updateUserListItemsWithClient(pb, { recordId: cart.id, items });
			return { success: true, items };
		});
	},
	{ auth: true }
);

export const DELETE: RequestHandler = apiHandler(
	async ({ request, locals }) => {
		const parsed = cartDeleteSchema.safeParse(await request.json());
		if (!parsed.success) {
			throw { status: 400, message: parsed.error.issues[0]?.message ?? 'Invalid payload' };
		}

		const { id, variantId } = parsed.data;
		const userId = locals.user!.id;

		return withAdmin(async (pb) => {
			const cart = await getUserListRecordWithClient<CartItem>(pb, userId, 'cart');
			if (!cart) return { success: true, items: [] };

			const items: CartItem[] = cart.items || [];
			const newItems = items.filter((i) => !(i.id === id && i.variantId === variantId));

			if (newItems.length !== items.length) {
				await updateUserListItemsWithClient(pb, {
					recordId: cart.id,
					items: newItems,
					ignoreNotFound: true
				});
			}

			return { success: true, items: newItems };
		});
	},
	{ auth: true }
);
