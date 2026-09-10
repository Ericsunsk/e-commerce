import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { adminLoginRedirect, isAdminLoginPath } from '$domains/admin/server';
import { getGlobalSettings } from '$domains/content/server';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const settings = await getGlobalSettings().catch(() => null);
	const logoUrl = settings?.icon || null;
	const siteName = settings?.siteName || 'JEVARIE';

	if (isAdminLoginPath(url.pathname)) {
		return {
			adminEmail: locals.admin?.email ?? null,
			logoUrl,
			siteName
		};
	}
	// Hooks guard already validated the session; stay defensive for direct loads.
	if (!locals.admin) {
		throw redirect(303, adminLoginRedirect(url.pathname, url.search));
	}
	return {
		adminEmail: locals.admin.email,
		logoUrl,
		siteName
	};
};
