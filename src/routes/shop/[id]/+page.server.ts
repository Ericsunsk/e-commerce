import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getProductById, getRelatedProducts } from '$lib/server/products';

export const load: PageServerLoad = async ({ params }) => {
	// Parallel fetch: Product is critical, related products are secondary but can be fetched concurrently
	const [product, related] = await Promise.all([
		getProductById(params.id),
		getRelatedProducts(params.id)
	]);

	if (!product) {
		error(404, 'Product not found');
	}

	return {
		product,
		related
	};
};
