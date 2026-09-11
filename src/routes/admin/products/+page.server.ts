import type { PageServerLoad } from './$types';
import { listAdminProducts, getCategories } from '$domains/catalog/server';

export const load: PageServerLoad = async () => {
	const [products, categories] = await Promise.all([
		listAdminProducts(),
		getCategories().catch(() => [])
	]);
	return { products, categories };
};
