import type { PageServerLoad } from './$types';
import { getProducts, getCategories, getCatalogFilters } from '$domains/catalog/server';
import { getPage, getPageSections, getCollectionImages } from '$domains/content/server';

export const load: PageServerLoad = async ({ url }) => {
	const { categorySlug, gender, pageSlug } = getCatalogFilters(url, 'collection');

	const [products, page, sections, categories, collectionImages] = await Promise.all([
		getProducts({ categorySlug, gender, isFeatured: true }),
		getPage(pageSlug).then((p) => p || getPage('collection')),
		getPageSections(pageSlug).then((s) => (s.length ? s : getPageSections('collection'))),
		getCategories(),
		getCollectionImages()
	]);

	return {
		products,
		page,
		sections,
		categories,
		collectionImages,
		filters: {
			category: categorySlug,
			gender: gender
		}
	};
};
