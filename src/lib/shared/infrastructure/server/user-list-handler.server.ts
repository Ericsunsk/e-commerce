/**
 * Document List HTTP adapter (Shared Infrastructure).
 *
 * Pure transport + persistence seam: parses/validates HTTP payloads, loads and
 * saves user-list documents via `user-lists.server`, and delegates every
 * mutation decision to caller-injected domain functions. No cart/wishlist
 * rules live here — those reside in their respective domain modules.
 */
import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { apiHandler } from './api-handler.server';
import { withAdmin } from './admin.server';
import {
	getUserListRecordWithClient,
	updateUserListItemsWithClient,
	upsertUserListItemsWithClient,
	type UserListType
} from './user-lists.server';

export interface DocumentListItem {
	id: string;
	variantId?: string;
}

export interface DocumentListPostResult<TItem> {
	items: TItem[];
	changed: boolean;
}

export interface QuantityPayload {
	id: string;
	variantId?: string;
	quantity: number;
}

export interface IdentityPayload {
	id: string;
	variantId?: string;
}

/** Domain-owned mutation rules injected by Cart / Customer bounded contexts. */
export interface DocumentListMutations<TItem> {
	post(current: TItem[], incoming: TItem): DocumentListPostResult<TItem>;
	patch?(current: TItem[], payload: QuantityPayload): TItem[];
	remove(current: TItem[], payload: IdentityPayload): TItem[];
}

export interface DocumentListHandlerConfig<TItem> {
	type: UserListType;
	itemSchema: z.ZodType<TItem>;
	mutations: DocumentListMutations<TItem>;
	missingListMessage?: string;
}

const identityPayloadSchema = z.object({
	id: z.string().min(1),
	variantId: z.string().optional()
});

const quantityPayloadSchema = z.object({
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

export function createDocumentListHandlers<TItem extends DocumentListItem>(
	config: DocumentListHandlerConfig<TItem>
) {
	const missingListMessage = config.missingListMessage ?? 'List not found';

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

				const { items: nextItems, changed } = config.mutations.post(baseItems, newItem);

				if (changed) {
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
	if (config.mutations.patch) {
		const patch = config.mutations.patch;
		PATCH = apiHandler(
			async ({ request, locals }) => {
				const payload = parsePayloadOrThrow(
					quantityPayloadSchema,
					await request.json(),
					'Invalid payload'
				);
				const userId = locals.user!.id;

				return withAdmin(async (pb) => {
					const userList = await getUserListRecordWithClient<TItem>(pb, userId, config.type);
					if (!userList) {
						throw { status: 404, message: missingListMessage };
					}

					const currentItems = userList.items ? [...userList.items] : [];
					const nextItems = patch(currentItems, payload);

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
				identityPayloadSchema,
				await request.json(),
				'Invalid payload'
			);
			const userId = locals.user!.id;

			return withAdmin(async (pb) => {
				const userList = await getUserListRecordWithClient<TItem>(pb, userId, config.type);
				if (!userList) return { success: true, items: [] };

				const currentItems = userList.items || [];
				const nextItems = config.mutations.remove(currentItems, payload);

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
