import type { TypedPocketBase, UserListsResponse } from '$lib/pocketbase-types';
import { Collections } from '$lib/pocketbase-types';
import { getErrorStatus, sanitizePocketBaseJson } from '$lib/server/pocketbase-json';

export type UserListType = 'cart' | 'wishlist';

function buildUserListFilter(pb: TypedPocketBase, userId: string, type: UserListType): string {
	const pbAny = pb as unknown as {
		filter?: (query: string, params: Record<string, unknown>) => string;
	};
	if (typeof pbAny.filter === 'function') {
		return pbAny.filter('user = {:userId} && type = {:type}', { userId, type });
	}
	return `user="${userId}" && type="${type}"`;
}

export async function getUserListRecordWithClient<TItem>(
	pb: TypedPocketBase,
	userId: string,
	type: UserListType
): Promise<UserListsResponse<TItem[]> | null> {
	try {
		return await pb
			.collection(Collections.UserLists)
			.getFirstListItem<UserListsResponse<TItem[]>>(buildUserListFilter(pb, userId, type));
	} catch (err: unknown) {
		if (getErrorStatus(err) === 404) return null;
		throw err;
	}
}

export async function upsertUserListItemsWithClient<TItem>(
	pb: TypedPocketBase,
	args: {
		userId: string;
		type: UserListType;
		items: TItem[];
		recordId?: string | null;
	}
): Promise<void> {
	const { userId, type, items, recordId } = args;

	// PocketBase JSON fields marked required may reject empty arrays.
	// Delete the record when it becomes empty.
	if (items.length === 0) {
		if (!recordId) return;
		try {
			await pb.collection(Collections.UserLists).delete(recordId);
		} catch (err: unknown) {
			if (getErrorStatus(err) !== 404) throw err;
		}
		return;
	}

	const sanitizedItems = sanitizePocketBaseJson(items);

	if (recordId) {
		try {
			await pb.collection(Collections.UserLists).update(recordId, { items: sanitizedItems });
			return;
		} catch (err: unknown) {
			// If record was deleted concurrently, fall through to create.
			if (getErrorStatus(err) !== 404) throw err;
		}
	}

	await pb.collection(Collections.UserLists).create({
		user: userId,
		type,
		items: sanitizedItems
	});
}

export async function updateUserListItemsWithClient<TItem>(
	pb: TypedPocketBase,
	args: {
		items: TItem[];
		recordId: string;
		ignoreNotFound?: boolean;
	}
): Promise<void> {
	const { items, recordId, ignoreNotFound = false } = args;

	// PocketBase JSON fields marked required may reject empty arrays.
	// Delete the record when it becomes empty.
	if (items.length === 0) {
		try {
			await pb.collection(Collections.UserLists).delete(recordId);
		} catch (err: unknown) {
			if (getErrorStatus(err) !== 404) throw err;
		}
		return;
	}

	const sanitizedItems = sanitizePocketBaseJson(items);
	try {
		await pb.collection(Collections.UserLists).update(recordId, { items: sanitizedItems });
	} catch (err: unknown) {
		if (getErrorStatus(err) === 404 && ignoreNotFound) return;
		throw err;
	}
}
