import type { PageServerLoad } from './$types';
import { loadProductDetailOr404 } from '$lib/server/product-detail';

export const load: PageServerLoad = async ({ params }) => {
	return loadProductDetailOr404(params.id);
};
