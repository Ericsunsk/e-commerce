import type { PageServerLoad } from './$types';
import { getFeaturedProducts, getCategories } from '$lib/server/products';
import { getPage, getPageSections, getAssetsByGroup } from '$lib/server/content';

export const load: PageServerLoad = async () => {
    const [page, featuredProducts, sections, categories, homeAssets] = await Promise.all([
        getPage('home'),
        getFeaturedProducts(),
        getPageSections('home'),
        getCategories(),
        getAssetsByGroup('home')
    ]);

    return {
        page,
        featuredProducts,
        sections,
        categories,
        homeAssets
    };
};
