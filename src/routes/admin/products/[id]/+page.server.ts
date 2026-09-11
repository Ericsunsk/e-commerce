import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminProductForEdit, getCategories } from '$domains/catalog/server';

export const load: PageServerLoad = async ({ params }) => {
	const [product, categories] = await Promise.all([
		getAdminProductForEdit(params.id),
		getCategories().catch(() => [])
	]);
	if (!product) {
		throw error(404, '商品不存在');
	}
	return { product, categories };
};
