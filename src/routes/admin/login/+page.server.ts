import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	ADMIN_SESSION_COOKIE,
	createAdminSession,
	extractAdminToken,
	validateAdminSessionToken
} from '$domains/admin/server';

const SESSION_MAX_AGE = 60 * 60 * 8; // 8h

export const load: PageServerLoad = async ({ url, request }) => {
	const token = extractAdminToken(request.headers.get('cookie'));
	if (token && (await validateAdminSessionToken(token))) {
		throw redirect(303, url.searchParams.get('redirect') || '/admin');
	}
	return { redirectTo: url.searchParams.get('redirect') || '/admin' };
};

export const actions: Actions = {
	login: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') || '').trim();
		const password = String(form.get('password') || '');
		const redirectTo = String(form.get('redirect') || url.searchParams.get('redirect') || '/admin');

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		try {
			const session = await createAdminSession(email, password);
			cookies.set(ADMIN_SESSION_COOKIE, session.token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: url.protocol === 'https:',
				maxAge: SESSION_MAX_AGE
			});
		} catch {
			return fail(401, { error: 'Invalid admin credentials' });
		}

		throw redirect(303, redirectTo);
	}
};
