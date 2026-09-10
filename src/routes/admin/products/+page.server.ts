import type { PageServerLoad } from './$types';
import { listAdminProducts } from '$domains/catalog/server';

export const load: PageServerLoad = async () => {
	return { products: await listAdminProducts() };
};
