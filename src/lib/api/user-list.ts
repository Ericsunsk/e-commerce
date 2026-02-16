import { apiClient } from '$lib/api/client';

export interface UserListResponse<TItem> {
	items: TItem[];
}

type UserListEndpoint = '/api/cart' | '/api/wishlist';

type UserListItemIdentity = {
	id: string;
	variantId?: string;
};

type UserListQuantityPatch = UserListItemIdentity & {
	quantity: number;
};

export async function fetchUserList<TItem>(endpoint: UserListEndpoint): Promise<TItem[]> {
	const data = await apiClient<UserListResponse<TItem>>(endpoint);
	return data.items || [];
}

export function addUserListItem<TItem>(
	endpoint: UserListEndpoint,
	item: TItem
): Promise<UserListResponse<TItem>> {
	return apiClient<UserListResponse<TItem>>(endpoint, {
		method: 'POST',
		body: JSON.stringify(item)
	});
}

export function patchUserListItemQuantity<TItem>(
	endpoint: UserListEndpoint,
	payload: UserListQuantityPatch
): Promise<UserListResponse<TItem>> {
	return apiClient<UserListResponse<TItem>>(endpoint, {
		method: 'PATCH',
		body: JSON.stringify(payload)
	});
}

export function removeUserListItem<TItem>(
	endpoint: UserListEndpoint,
	payload: UserListItemIdentity
): Promise<UserListResponse<TItem>> {
	return apiClient<UserListResponse<TItem>>(endpoint, {
		method: 'DELETE',
		body: JSON.stringify(payload)
	});
}
