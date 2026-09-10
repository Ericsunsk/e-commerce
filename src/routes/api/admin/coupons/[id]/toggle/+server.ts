import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setCouponActive } from '$domains/checkout/server';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.admin) {
		throw error(401, 'Admin authentication required');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const isActive = (body as Record<string, unknown> | null)?.is_active;
	if (typeof isActive !== 'boolean') {
		throw error(400, 'is_active must be a boolean');
	}

	const result = await setCouponActive(params.id, isActive);
	return json({ success: true, ...result });
};
