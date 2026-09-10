import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminProductForEdit } from '$domains/catalog/server';

export const load: PageServerLoad = async ({ params }) => {
	const product = await getAdminProductForEdit(params.id);
	if (!product) {
		throw error(404, 'Product not found');
	}
	return { product };
};
