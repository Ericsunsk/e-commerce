import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateCatalogProduct } from '$domains/catalog/server';
import { getErrorStatus } from '$shared/infrastructure/server';

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

	try {
		const product = await updateCatalogProduct(params.id, body);
		return json({ success: true, product });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: 'Product update failed';
		throw error(status, message);
	}
};
