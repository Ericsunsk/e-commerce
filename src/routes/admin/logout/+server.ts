import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ADMIN_SESSION_COOKIE } from '$domains/admin/server';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
	throw redirect(303, '/admin/login');
};
