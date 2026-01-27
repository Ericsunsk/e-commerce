import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getProductById, getRelatedProducts } from '$lib/server/products';

export const load: PageServerLoad = async ({ params }) => {
    const product = await getProductById(params.id);

    if (!product) {
        error(404, 'Product not found');
    }

    const related = await getRelatedProducts(params.id);

    return {
        product,
        related
    };
};
