import type { PageServerLoad } from './$types';
import { getAdminSiteSettings, GLOBAL_SETTINGS_FIELDS } from '$domains/content/server';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async () => {
	const settings = await getAdminSiteSettings();
	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
	return { settings, fields: GLOBAL_SETTINGS_FIELDS, pocketbaseUrl };
};
