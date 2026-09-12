import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	ADMIN_SESSION_COOKIE,
	extractAdminToken,
	invalidateAdminSessionToken
} from '$domains/admin/server';

export const POST: RequestHandler = async ({ cookies, request }) => {
	// Invalidate the server-side cache entry too — clearing the cookie alone
	// would leave the token authorizing requests until the cache TTL expires.
	invalidateAdminSessionToken(extractAdminToken(request.headers.get('cookie')) ?? '');
	cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
	throw redirect(303, '/admin/login');
};
