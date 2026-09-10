import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { testStripeConnection } from '$domains/payment/server';

/** Verify a secret key against the live Stripe API (never persists). */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}

	let body: Record<string, unknown> = {};
	try {
		body = await request.json();
	} catch {
		// Empty body → test the stored/effective key.
	}

	const candidate = typeof body.secretKey === 'string' ? body.secretKey : undefined;
	const result = await testStripeConnection(candidate);
	return json({ success: true, ...result });
};
