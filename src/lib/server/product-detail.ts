import { error } from '@sveltejs/kit';
import { getProductById, getRelatedProducts } from '$lib/server/products';

export async function loadProductDetailOr404(id: string) {
	const [product, related] = await Promise.all([getProductById(id), getRelatedProducts(id)]);

	if (!product) {
		throw error(404, 'Product not found');
	}

	return { product, related };
}
