import type { PageServerLoad } from './$types';
import { loadProductDetailOr404 } from '$domains/catalog/server';

export const load: PageServerLoad = async ({ params }) => {
	return loadProductDetailOr404(params.id);
};
