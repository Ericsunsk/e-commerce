import type { PageServerLoad } from './$types';
import { listAdminPages, listAdminSections } from '$domains/content/server';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async () => {
	const [pages, sections] = await Promise.all([listAdminPages(), listAdminSections()]);
	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

	return {
		pages,
		sections,
		pocketbaseUrl
	};
};
