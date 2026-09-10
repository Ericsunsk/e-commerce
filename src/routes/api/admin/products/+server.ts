import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCatalogProduct } from '$domains/catalog/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const POST: RequestHandler = async ({ locals, request }) => {
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
		const product = await createCatalogProduct(body);
		return json({ success: true, product }, { status: 201 });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: 'Product creation failed';
		throw error(status, message);
	}
};
