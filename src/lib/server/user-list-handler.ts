import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { apiHandler } from '$lib/server/api-handler';
import { withAdmin } from '$lib/server/admin';
import {
	getUserListRecordWithClient,
	updateUserListItemsWithClient,
	upsertUserListItemsWithClient,
	type UserListType
} from '$lib/server/user-lists';

type BaseUserListItem = {
	id: string;
	variantId?: string;
};

type PostMode = 'mergeQuantity' | 'appendIfMissing';
type DeleteMode = 'exactVariant' | 'removeAllWhenVariantMissing';

type QuantityPatchPayload = {
	id: string;
	variantId?: string;
	quantity: number;
};

interface UserListHandlerConfig<TItem extends BaseUserListItem> {
	type: UserListType;
	itemSchema: z.ZodType<TItem>;
	postMode: PostMode;
	deleteMode: DeleteMode;
	enablePatchQuantity?: boolean;
}

const deletePayloadSchema = z.object({
	id: z.string().min(1),
	variantId: z.string().optional()
});

const quantityPatchSchema = z.object({
	id: z.string().min(1),
	variantId: z.string().optional(),
	quantity: z.number()
});

function parsePayloadOrThrow<T>(schema: z.ZodType<T>, input: unknown, fallbackMessage: string): T {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw { status: 400, message: parsed.error.issues[0]?.message ?? fallbackMessage };
	}
	return parsed.data;
}

function isSameItem<TItem extends BaseUserListItem>(
	item: TItem,
	payload: Pick<BaseUserListItem, 'id' | 'variantId'>
) {
	return item.id === payload.id && item.variantId === payload.variantId;
}

function mergeQuantityIntoItems<TItem extends BaseUserListItem>(
	items: TItem[],
	newItem: TItem
): TItem[] {
	const existingIndex = items.findIndex((item) => isSameItem(item, newItem));
	if (existingIndex === -1) return [...items, newItem];

	const existingItem = items[existingIndex] as TItem & { quantity?: number };
	const incomingItem = newItem as TItem & { quantity?: number };
	const existingQuantity = typeof existingItem.quantity === 'number' ? existingItem.quantity : 0;
	const incomingQuantity = typeof incomingItem.quantity === 'number' ? incomingItem.quantity : 0;

	const updatedItems = [...items];
	updatedItems[existingIndex] = {
		...updatedItems[existingIndex],
		quantity: existingQuantity + incomingQuantity
	} as TItem;
	return updatedItems;
}

function appendIfMissing<TItem extends BaseUserListItem>(items: TItem[], newItem: TItem): TItem[] {
	const exists = items.some((item) => isSameItem(item, newItem));
	if (exists) return items;
	return [...items, newItem];
}

function removeItems<TItem extends BaseUserListItem>(
	items: TItem[],
	payload: Pick<BaseUserListItem, 'id' | 'variantId'>,
	mode: DeleteMode
) {
	if (
		mode === 'removeAllWhenVariantMissing' &&
		(typeof payload.variantId !== 'string' || payload.variantId.length === 0)
	) {
		return items.filter((item) => item.id !== payload.id);
	}

	return items.filter((item) => !isSameItem(item, payload));
}

function updateQuantityInItems<TItem extends BaseUserListItem>(
	items: TItem[],
	payload: QuantityPatchPayload
): TItem[] {
	const itemIndex = items.findIndex((item) => isSameItem(item, payload));
	if (itemIndex === -1) {
		throw { status: 404, message: 'Item not found in cart' };
	}

	const updatedItems = [...items];
	if (payload.quantity <= 0) {
		updatedItems.splice(itemIndex, 1);
		return updatedItems;
	}

	updatedItems[itemIndex] = {
		...updatedItems[itemIndex],
		quantity: payload.quantity
	} as TItem;
	return updatedItems;
}

export function createUserListHandlers<TItem extends BaseUserListItem>(
	config: UserListHandlerConfig<TItem>
) {
	const GET: RequestHandler = apiHandler(async ({ locals }) => {
		if (!locals.user) return { items: [] };
		const userId = locals.user.id;

		return withAdmin(async (pb) => {
			const userList = await getUserListRecordWithClient<TItem>(pb, userId, config.type);
			return { items: userList?.items ?? [] };
		});
	});

	const POST: RequestHandler = apiHandler(
		async ({ request, locals }) => {
			const newItem = parsePayloadOrThrow(config.itemSchema, await request.json(), 'Invalid item');
			const userId = locals.user!.id;

			return withAdmin(async (pb) => {
				const userList = await getUserListRecordWithClient<TItem>(pb, userId, config.type);
				const baseItems = userList?.items ? [...userList.items] : [];

				const nextItems =
					config.postMode === 'mergeQuantity'
						? mergeQuantityIntoItems(baseItems, newItem)
						: appendIfMissing(baseItems, newItem);
				const hasChanges =
					nextItems.length !== baseItems.length || config.postMode === 'mergeQuantity';

				if (hasChanges) {
					await upsertUserListItemsWithClient(pb, {
						userId,
						type: config.type,
						items: nextItems,
						recordId: userList?.id
					});
				}

				return { success: true, items: nextItems };
			});
		},
		{ auth: true }
	);

	let PATCH: RequestHandler | undefined;
	if (config.enablePatchQuantity) {
		PATCH = apiHandler(
			async ({ request, locals }) => {
				const payload = parsePayloadOrThrow(
					quantityPatchSchema,
					await request.json(),
					'Invalid payload'
				);
				const userId = locals.user!.id;

				return withAdmin(async (pb) => {
					const userList = await getUserListRecordWithClient<TItem>(pb, userId, config.type);
					if (!userList) {
						throw { status: 404, message: 'Cart not found' };
					}

					const currentItems = userList.items ? [...userList.items] : [];
					const nextItems = updateQuantityInItems(currentItems, payload);

					await updateUserListItemsWithClient(pb, { recordId: userList.id, items: nextItems });
					return { success: true, items: nextItems };
				});
			},
			{ auth: true }
		);
	}

	const DELETE: RequestHandler = apiHandler(
		async ({ request, locals }) => {
			const payload = parsePayloadOrThrow(
				deletePayloadSchema,
				await request.json(),
				'Invalid payload'
			);
			const userId = locals.user!.id;

			return withAdmin(async (pb) => {
				const userList = await getUserListRecordWithClient<TItem>(pb, userId, config.type);
				if (!userList) return { success: true, items: [] };

				const currentItems = userList.items || [];
				const nextItems = removeItems(currentItems, payload, config.deleteMode);

				if (nextItems.length !== currentItems.length) {
					await updateUserListItemsWithClient(pb, {
						recordId: userList.id,
						items: nextItems,
						ignoreNotFound: true
					});
				}

				return { success: true, items: nextItems };
			});
		},
		{ auth: true }
	);

	return { GET, POST, PATCH, DELETE };
}
