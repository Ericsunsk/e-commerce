import type { PageServerLoad } from './$types';
import { listAdminPages } from '$domains/content/server';

export const load: PageServerLoad = async () => {
	return { pages: await listAdminPages() };
};
