export const SHOP_CATEGORIES = ['ALL', 'TOPS', 'BOTTOMS', 'KNITWEAR', 'FOOTWEAR'] as const;

export const SORT_OPTIONS = [
	'Featured',
	'Newest',
	'Price: Low to High',
	'Price: High to Low'
] as const;

export function getCatalogFilters(url: URL, fallbackSlug: string) {
	const categorySlug = url.searchParams.get('category') || undefined;
	const gender = url.searchParams.get('gender') || undefined;
	const pageSlug = gender || categorySlug || fallbackSlug;

	return { categorySlug, gender, pageSlug };
}
