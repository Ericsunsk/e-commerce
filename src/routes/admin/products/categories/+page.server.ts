import type { PageServerLoad } from './$types';
import { listAdminCategories } from '$domains/catalog/server';

export const load: PageServerLoad = async () => {
	return { categories: await listAdminCategories() };
};
