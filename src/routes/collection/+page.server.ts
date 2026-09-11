import type { PageServerLoad } from './$types';
import { getProducts, getCategories, getCatalogFilters } from '$domains/catalog/server';
import { getPage, getPageSections } from '$domains/content/server';

export const load: PageServerLoad = async ({ url }) => {
	const { categorySlug, gender, pageSlug } = getCatalogFilters(url, 'collection');

	const [products, page, sections, categories] = await Promise.all([
		getProducts({ categorySlug, gender, isFeatured: true }),
		getPage(pageSlug).then((p) => p || getPage('collection')),
		getPageSections(pageSlug).then((s) => (s.length ? s : getPageSections('collection'))),
		getCategories()
	]);

	return {
		products,
		page,
		sections,
		categories,
		filters: {
			category: categorySlug,
			gender: gender
		}
	};
};
