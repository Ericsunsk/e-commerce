import { isValidSlug } from '$shared/kernel';
import { withAdmin } from '$shared/infrastructure/server';
import type { TypedPocketBase, CategoriesResponse, ProductsResponse } from '$shared/infrastructure';
import { Collections } from '$shared/infrastructure';
import type { Product, Category } from '../domain/models';
import {
	mapRecordToProduct,
	mapRecordToCategory,
	mapCategoriesFromExpand
} from '../infrastructure/product-mapper.server';
import {
	enrichProductWithStripe,
	enrichProductsBulk
} from '../infrastructure/stripe-pricing.server';

const PRODUCT_EXPAND = 'category,product_variants(product)';

function mapProductWithExpandedCategories(record: ProductsResponse): Product {
	const expandedCategories = mapCategoriesFromExpand(
		(record.expand as { category?: CategoriesResponse | CategoriesResponse[] })?.category
	);
	return mapRecordToProduct(record, expandedCategories);
}

async function mapAndEnrichProduct(record: ProductsResponse): Promise<Product> {
	return enrichProductWithStripe(mapProductWithExpandedCategories(record));
}

async function mapAndEnrichProducts(records: ProductsResponse[]): Promise<Product[]> {
	return enrichProductsBulk(records.map((record) => mapProductWithExpandedCategories(record)));
}

export async function getCategories(): Promise<Category[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.Categories).getFullList({
			filter: 'is_visible=true',
			sort: 'sort_order'
		});

		return records.map((r) => mapRecordToCategory(r));
	}, []);
}

export async function getCategoryBySlugWithClient(
	pb: TypedPocketBase,
	slug: string
): Promise<Category | null> {
	if (!isValidSlug(slug)) return null;

	try {
		const record = await pb.collection(Collections.Categories).getFirstListItem(`slug="${slug}"`);
		return mapRecordToCategory(record);
	} catch {
		return null;
	}
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
	return withAdmin(async (pb) => getCategoryBySlugWithClient(pb, slug), null);
}

interface ProductFilterOptions {
	categorySlug?: string;
	gender?: string;
	isFeatured?: boolean;
}

async function appendCategoryRelationFilterBySlug(
	pb: TypedPocketBase,
	filters: string[],
	slug: string | undefined,
	warningPrefix: 'Category' | 'Gender'
): Promise<void> {
	if (!slug) return;

	const category = await getCategoryBySlugWithClient(pb, slug);
	if (category) {
		filters.push(`category ?~ "${category.id}"`);
		return;
	}

	console.warn(`[getProducts] ${warningPrefix} slug not found: ${slug}`);
}

export async function getProducts(options?: ProductFilterOptions): Promise<Product[]> {
	return withAdmin(async (pb) => {
		const filters: string[] = [];

		await appendCategoryRelationFilterBySlug(pb, filters, options?.categorySlug, 'Category');
		await appendCategoryRelationFilterBySlug(pb, filters, options?.gender, 'Gender');

		if (options?.isFeatured) {
			filters.push('is_featured = true');
		}

		const filter = filters.length > 0 ? filters.join(' && ') : undefined;

		const records = await pb.collection(Collections.Products).getFullList({
			filter: filter,
			expand: PRODUCT_EXPAND
		});

		return mapAndEnrichProducts(records);
	}, []);
}

export async function getProductById(slug: string): Promise<Product | undefined> {
	if (!isValidSlug(slug)) {
		console.warn(`Invalid slug format: ${slug}`);
		return undefined;
	}

	return withAdmin(async (pb) => {
		const record = await pb.collection(Collections.Products).getFirstListItem(`slug="${slug}"`, {
			expand: PRODUCT_EXPAND
		});

		return mapAndEnrichProduct(record);
	}, undefined);
}

export interface CheckoutProductResolution {
	recordId: string;
	product: Product;
}

export async function resolveCheckoutProductWithClient(
	pb: TypedPocketBase,
	idOrSlug: string
): Promise<CheckoutProductResolution | undefined> {
	try {
		const record = await pb.collection(Collections.Products).getOne(idOrSlug, {
			expand: PRODUCT_EXPAND
		});

		const product = await mapAndEnrichProduct(record);
		return { recordId: record.id, product };
	} catch {
		// Fall through to slug lookup.
	}

	try {
		const record = await pb
			.collection(Collections.Products)
			.getFirstListItem(`slug="${idOrSlug}"`, {
				expand: PRODUCT_EXPAND
			});

		const product = await mapAndEnrichProduct(record);
		return { recordId: record.id, product };
	} catch {
		return undefined;
	}
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
	if (!isValidSlug(categorySlug)) {
		return [];
	}

	return withAdmin(async (pb) => {
		const category = await getCategoryBySlugWithClient(pb, categorySlug);
		if (!category) return [];

		const records = await pb.collection(Collections.Products).getFullList({
			filter: `category.id ?~ "${category.id}"`,
			expand: PRODUCT_EXPAND
		});

		return mapAndEnrichProducts(records);
	}, []);
}

export async function getFeaturedProducts(): Promise<Product[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.Products).getFullList({
			filter: 'is_featured=true',
			expand: PRODUCT_EXPAND
		});

		if (records.length === 0) {
			const fallbackRecords = await pb.collection(Collections.Products).getList(1, 6, {
				expand: PRODUCT_EXPAND
			});
			return mapAndEnrichProducts(fallbackRecords.items);
		}

		return mapAndEnrichProducts(records);
	}, []);
}

export async function getRelatedProducts(currentId: string, limit = 4): Promise<Product[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.Products).getList(1, limit + 1, {
			expand: PRODUCT_EXPAND
		});

		const filtered = records.items.filter((r) => r.slug !== currentId).slice(0, limit);

		return mapAndEnrichProducts(filtered);
	}, []);
}
