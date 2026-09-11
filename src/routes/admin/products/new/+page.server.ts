import type { PageServerLoad } from './$types';
import { getCategories } from '$domains/catalog/server';

export const load: PageServerLoad = async () => {
	const categories = await getCategories().catch(() => []);
	return { categories };
};
