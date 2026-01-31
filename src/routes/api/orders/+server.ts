import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrdersByUser } from '$lib/server/orders';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';
import { Collections } from '$lib/pocketbase-types';

export const GET: RequestHandler = async ({ url, request }) => {
	const userId = url.searchParams.get('userId');

	if (!userId) {
		return json({ error: 'User ID is required' }, { status: 400 });
	}

	// SECURITY: Verify the requester owns this userId
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Create a temporary client to verify the token
		const pbUrl = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
		const pb = new PocketBase(pbUrl);

		// Load token from header (Bearer ...)
		const token = authHeader.replace('Bearer ', '');
		pb.authStore.save(token, null);

		// Refresh to validate token validity and get fresh model
		await pb.collection(Collections.Users).authRefresh();

		// Check if the authenticated user matches the requested userId
		if (pb.authStore.model?.id !== userId) {
			console.warn(
				`⚠️ Forbidden access attempt: User ${pb.authStore.model?.id} tried to access orders of ${userId}`
			);
			return json({ error: 'Forbidden' }, { status: 403 });
		}
	} catch (e: unknown) {
		console.error('Auth verification failed:', e);
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	console.log('🔍 Fetching orders for userId:', userId);

	try {
		const orders = await getOrdersByUser(userId);
		return json({ orders });
	} catch (_err) {
		return json({ error: 'Failed to fetch orders' }, { status: 500 });
	}
};
