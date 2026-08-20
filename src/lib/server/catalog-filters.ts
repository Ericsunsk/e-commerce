export function getCatalogFilters(url: URL, fallbackSlug: string) {
	const categorySlug = url.searchParams.get('category') || undefined;
	const gender = url.searchParams.get('gender') || undefined;
	const pageSlug = gender || categorySlug || fallbackSlug;

	return { categorySlug, gender, pageSlug };
}
