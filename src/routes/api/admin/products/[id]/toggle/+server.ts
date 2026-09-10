import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setProductActive } from '$domains/catalog/server';
import { normalizeActiveToggle } from '$domains/catalog/domain/product-visibility';

/** Lightweight admin PATCH: flip `is_active` without a full page reload. */
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

	let isActive: boolean;
	try {
		isActive = normalizeActiveToggle(body);
	} catch {
		throw error(400, 'is_active must be a boolean');
	}

	const result = await setProductActive(params.id, isActive);
	return json({ success: true, ...result });
};
