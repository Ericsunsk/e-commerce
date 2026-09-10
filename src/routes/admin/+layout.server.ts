import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { adminLoginRedirect } from '$domains/admin/server';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Hooks guard already validated the session; stay defensive for direct loads.
	if (!locals.admin) {
		throw redirect(303, adminLoginRedirect(url.pathname, url.search));
	}
	return { adminEmail: locals.admin.email };
};
