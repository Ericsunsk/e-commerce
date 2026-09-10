import type { PageServerLoad } from './$types';
import { getAdminSiteSettings, GLOBAL_SETTINGS_FIELDS } from '$domains/content/server';

export const load: PageServerLoad = async () => {
	const settings = await getAdminSiteSettings();
	return { settings, fields: GLOBAL_SETTINGS_FIELDS };
};
