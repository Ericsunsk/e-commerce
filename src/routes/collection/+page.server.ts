import type { PageServerLoad } from './$types';
import { getProducts, getCategories } from '$lib/server/products';
import { getPage, getPageSections, getCollectionImages } from '$lib/server/content';

export const load: PageServerLoad = async ({ url }) => {
    // 从 URL 查询参数获取筛选条件
    const categorySlug = url.searchParams.get('category') || undefined;
    const gender = url.searchParams.get('gender') || undefined;

    // Use gender or category as slug if available, fallback to 'collection'
    const pageSlug = gender || categorySlug || 'collection';

    const [products, page, sections, categories, collectionImages] = await Promise.all([
        getProducts({ categorySlug, gender, isFeatured: true }),
        getPage(pageSlug).then(p => p || getPage('collection')),
        getPageSections(pageSlug).then(s => s.length ? s : getPageSections('collection')),
        getCategories(),
        getCollectionImages()
    ]);

    // Need to pass public env for image URL construction
    const { env } = await import('$env/dynamic/public');

    return {
        products,
        page,
        sections,
        categories,
        collectionImages,
        env: {
            PUBLIC_POCKETBASE_URL: env.PUBLIC_POCKETBASE_URL
        },
        filters: {
            category: categorySlug,
            gender: gender
        }
    };
};
