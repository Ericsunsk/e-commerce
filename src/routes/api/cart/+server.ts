import type { RequestHandler } from './$types';
import { pb, initAdmin } from '$lib/server/pocketbase';
import type { UserListsResponse } from '$lib/pocketbase-types';
import { apiHandler } from '$lib/server/api-handler';
import { Collections } from '$lib/pocketbase-types';

// Define the structure of an item inside the JSON 'items' field
interface CartItem {
	id: string; // Product ID
	variantId?: string;
	quantity: number;
	title?: string;
	price?: number;
	image?: string;
	slug?: string;
	stripePriceId?: string;
	color?: string;
	size?: string;
}

// Helper to get the user's cart record
async function getCartRecord(userId: string): Promise<UserListsResponse<CartItem[]> | null> {
	try {
		await initAdmin();
		const record = await pb
			.collection(Collections.UserLists)
			.getFirstListItem<UserListsResponse<CartItem[]>>(`user="${userId}" && type="cart"`);
		return record;
	} catch (e: unknown) {
		const err = e as { status?: number };
		if (err.status === 404) return null;
		throw e;
	}
}

export const GET: RequestHandler = apiHandler(async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		return { items: [] }; // Guest cart? For now, empty.
	}

	const cart = await getCartRecord(locals.user.id);

	return {
		items: cart?.items || [],
		updated: cart?.updated
	};
});

export const POST: RequestHandler = apiHandler(
	async ({ request, locals }) => {
		const newItem: CartItem = await request.json();
		const userId = locals.user!.id; // Safe bang because auth: true

		await initAdmin();

		const cart = await getCartRecord(userId);
		const items: CartItem[] = cart?.items ? (cart.items as unknown as CartItem[]) : [];

		// Check if item already exists (match by ID and Variant)
		const existingIndex = items.findIndex(
			(i) => i.id === newItem.id && i.variantId === newItem.variantId
		);

		if (existingIndex > -1) {
			// Update quantity
			items[existingIndex].quantity += newItem.quantity;
		} else {
			// Add new
			// Sanitize: remove any undefined fields to prevent PB errors
			const sanitizedItem = JSON.parse(JSON.stringify(newItem));
			items.push(sanitizedItem);
		}

		// Sanitize entire items array before saving
		const sanitizedItems = JSON.parse(JSON.stringify(items));

		if (cart) {
			try {
				// Update existing record
				await pb.collection(Collections.UserLists).update(cart.id, {
					items: sanitizedItems
				});
			} catch (err: unknown) {
				console.error('Failed to update cart:', err);
				// If record was deleted concurrently, try creating it
				if (
					typeof err === 'object' &&
					err !== null &&
					'status' in err &&
					(err as any).status === 404
				) {
					await pb.collection(Collections.UserLists).create({
						user: userId,
						type: 'cart',
						items: items
					});
				} else {
					throw err;
				}
			}
		} else {
			// Create new record
			await pb.collection(Collections.UserLists).create({
				user: userId,
				type: 'cart',
				items: items
			});
		}

		return { success: true, items };
	},
	{ auth: true }
);

export const PATCH: RequestHandler = apiHandler(
	async ({ request, locals }) => {
		const { id, variantId, quantity } = await request.json();
		const userId = locals.user!.id;

		await initAdmin();
		const cart = await getCartRecord(userId);

		if (!cart) {
			// We can throw standard error, apiHandler will format it
			throw { status: 404, message: 'Cart not found' };
		}

		const items: CartItem[] = cart.items ? (cart.items as unknown as CartItem[]) : [];

		// Find item
		const index = items.findIndex((i) => i.id === id && i.variantId === variantId);

		if (index > -1) {
			if (quantity <= 0) {
				// Remove if quantity is zero or less
				items.splice(index, 1);
			} else {
				items[index].quantity = quantity;
			}

			await pb.collection(Collections.UserLists).update(cart.id, {
				items: items
			});

			return { success: true, items };
		}

		throw { status: 404, message: 'Item not found in cart' };
	},
	{ auth: true }
);

export const DELETE: RequestHandler = apiHandler(
	async ({ request, locals }) => {
		const { id, variantId } = await request.json();
		const userId = locals.user!.id;

		await initAdmin();
		const cart = await getCartRecord(userId);

		if (!cart) return { success: true, items: [] };

		const items: CartItem[] = cart.items ? (cart.items as unknown as CartItem[]) : [];

		const newItems = items.filter((i) => !(i.id === id && i.variantId === variantId));

		if (newItems.length !== items.length) {
			try {
				if (newItems.length === 0) {
					// Cart is now empty - delete the record instead of updating with empty array
					// (PocketBase 'items' field is required and rejects empty arrays)
					await pb.collection(Collections.UserLists).delete(cart.id);
				} else {
					// Sanitize items before saving
					const sanitizedItems = JSON.parse(JSON.stringify(newItems));
					await pb.collection(Collections.UserLists).update(cart.id, {
						items: sanitizedItems
					});
				}
			} catch (err) {
				console.error('Failed to update cart (remove item):', err);
				// If 404, it means cart is already gone - that's fine
				if (
					typeof err === 'object' &&
					err !== null &&
					'status' in err &&
					(err as any).status !== 404
				) {
					throw err;
				}
			}
		}

		return { success: true, items: newItems };
	},
	{ auth: true }
);
