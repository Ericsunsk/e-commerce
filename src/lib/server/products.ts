import { stripe } from './stripe';
import { env } from '$env/dynamic/private';
import type { Product, Category } from '$lib/types';
import { DEFAULTS, isValidSlug } from '$lib/constants';
import { formatCurrency } from '$lib/utils/price';
import type Stripe from 'stripe';
import { mapRecordToProduct, mapRecordToCategory, mapCategoriesFromExpand } from './mappers';
import { withAdmin } from '$lib/server/admin';
import type { TypedPocketBase, CategoriesResponse, ProductsResponse } from '$lib/pocketbase-types';
import { Collections } from '$lib/pocketbase-types';

// =============================================================================
// Stripe Enrichment Logic
// =============================================================================

// Simple in-memory cache for Stripe prices
// Key: stripeId, Value: { data: result, expires: timestamp }
type StripeResolvedPrice = {
	formatted: string;
	value: number;
};

type StripePriceCacheEntry = {
	data: StripeResolvedPrice;
	expires: number;
};

const priceCache = new Map<string, StripePriceCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache
export const STRIPE_TEST_FALLBACK_PRICE_VALUE = 195;
const STRIPE_TEST_FALLBACK_PRICE = `${DEFAULTS.currencySymbol}${STRIPE_TEST_FALLBACK_PRICE_VALUE.toFixed(2)}`;
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

function getStripeTestFallbackPrice() {
	return {
		formatted: STRIPE_TEST_FALLBACK_PRICE,
		value: STRIPE_TEST_FALLBACK_PRICE_VALUE
	};
}

async function fetchStripePrice(stripeId?: string): Promise<StripeResolvedPrice> {
	if (!stripeId) return { formatted: `${DEFAULTS.currencySymbol}0.00`, value: 0 };

	// Check Cache
	const cached = priceCache.get(stripeId);
	if (cached && Date.now() < cached.expires) {
		return cached.data;
	}

	const secretKey = env.STRIPE_SECRET_KEY || '';
	if (
		!secretKey ||
		secretKey.startsWith('sk_test_placeholder') ||
		stripeId.includes('TEST') ||
		stripeId.includes('placeholder') ||
		stripeId.includes('mock')
	) {
		return getStripeTestFallbackPrice();
	}

	try {
		let priceValue = 0;
		let currency = 'usd';

		if (stripeId.startsWith('price_')) {
			try {
				const price = await stripe.prices.retrieve(stripeId);
				priceValue = price.unit_amount || 0;
				currency = price.currency;
			} catch (e: unknown) {
				// Fallback for mismatched environments (Live ID in Test Env)
				// If we are in test mode and the error is "No such price", suppress the warning to reduce noise
				const isTestMode = env.STRIPE_SECRET_KEY?.startsWith('sk_test');
				const message = e instanceof Error ? e.message : String(e);
				if (!isTestMode || !message.includes('No such price')) {
					console.warn(
						`⚠️ Stripe price lookup failed for ${stripeId}: ${message}. Using fallback.`
					);
				}
				// In test mode, some products may reference live ids; keep checkout flow usable.
				if (isTestMode && message.includes('No such price')) {
					return getStripeTestFallbackPrice();
				}
				// Non-test environments should fail closed and avoid trusting unknown prices.
				return { formatted: 'N/A', value: 0 };
			}
		} else if (stripeId.startsWith('prod_')) {
			const product = await stripe.products.retrieve(stripeId);
			if (typeof product.default_price === 'string') {
				const price = await stripe.prices.retrieve(product.default_price);
				priceValue = price.unit_amount || 0;
				currency = price.currency;
			} else if (product.default_price && typeof product.default_price === 'object') {
				const expandedPrice = product.default_price as Stripe.Price;
				priceValue = expandedPrice.unit_amount || 0;
				currency = expandedPrice.currency || 'usd';
			}
		}

		const result = {
			formatted: formatCurrency(priceValue, { currency, isCents: true }),
			value: priceValue / 100
		};

		// Update Cache
		priceCache.set(stripeId, {
			data: result,
			expires: Date.now() + CACHE_TTL_MS
		});

		return result;
	} catch (e: unknown) {
		const err = e as { type?: string; message: string };
		if (err?.type !== 'StripeAuthenticationError') {
			console.error(`Failed to fetch Stripe price for ${stripeId}:`, err.message);
		}
		return getStripeTestFallbackPrice();
	}
}

async function enrichProductWithStripe(product: Product): Promise<Product> {
	if (product.stripePriceId) {
		const { formatted, value } = await fetchStripePrice(product.stripePriceId);
		// Only override if we got a valid value
		if (value > 0) {
			return { ...product, price: formatted, priceValue: value };
		}
		// If Stripe fetch failed (value 0/fallback), keep the existing product as-is.
	}
	return product;
}

// Optimized bulk fetch for Stripe prices
async function fetchStripePricesBulk(
	stripeIds: string[]
): Promise<Map<string, StripeResolvedPrice>> {
	if (stripeIds.length === 0) return new Map();

	const result = new Map<string, StripeResolvedPrice>();
	const idsToFetch: string[] = [];

	for (const id of stripeIds) {
		const cached = priceCache.get(id);
		if (cached && Date.now() < cached.expires) {
			result.set(id, cached.data);
		} else {
			idsToFetch.push(id);
		}
	}

	if (idsToFetch.length === 0) return result;

	const secretKey = env.STRIPE_SECRET_KEY || '';
	if (!secretKey || secretKey.startsWith('sk_test_placeholder')) {
		idsToFetch.forEach((id) => {
			const mock = getStripeTestFallbackPrice();
			result.set(id, mock);
			priceCache.set(id, { data: mock, expires: Date.now() + CACHE_TTL_MS });
		});
		return result;
	}

	try {
		// Chunking to avoid rate limits
		const CHUNK_SIZE = 10;
		const chunks = [];
		for (let i = 0; i < idsToFetch.length; i += CHUNK_SIZE) {
			chunks.push(idsToFetch.slice(i, i + CHUNK_SIZE));
		}

		for (const chunk of chunks) {
			const chunkPromises = chunk.map(async (id) => {
				try {
					let priceValue = 0;
					let currency = 'usd';

					if (id.startsWith('price_')) {
						const price = await stripe.prices.retrieve(id);
						priceValue = price.unit_amount || 0;
						currency = price.currency;
					} else if (id.startsWith('prod_')) {
						const product = await stripe.products.retrieve(id, { expand: ['default_price'] });

						if (product.default_price && typeof product.default_price === 'object') {
							const p = product.default_price as Stripe.Price;
							priceValue = p.unit_amount || 0;
							currency = p.currency || 'usd';
						} else if (typeof product.default_price === 'string') {
							const price = await stripe.prices.retrieve(product.default_price);
							priceValue = price.unit_amount || 0;
							currency = price.currency;
						}
					} else {
						return null;
					}

					const data = {
						formatted: formatCurrency(priceValue, { currency, isCents: true }),
						value: priceValue / 100
					};
					return { id, data };
				} catch {
					return null;
				}
			});

			const results = await Promise.all(chunkPromises);

			results.forEach((res) => {
				if (res) {
					result.set(res.id, res.data);
					priceCache.set(res.id, { data: res.data, expires: Date.now() + CACHE_TTL_MS });
				}
			});
		}
	} catch (e: unknown) {
		console.error('Bulk Stripe Fetch Error:', e instanceof Error ? e.message : String(e));
	}

	// Fill missing keys with individual fetch (fallback for any missed by search)
	for (const id of idsToFetch) {
		if (!result.has(id)) {
			const single = await fetchStripePrice(id);
			result.set(id, single);
		}
	}

	return result;
}

async function enrichProductsBulk(products: Product[]): Promise<Product[]> {
	const stripeIds = products.map((p) => p.stripePriceId).filter((id): id is string => !!id);

	const priceMap = await fetchStripePricesBulk(stripeIds);

	// In Test Mode (development), filter out products where Stripe fetch failed
	// This hides Live Mode products from the local/dev shop
	const isTestMode = env.STRIPE_SECRET_KEY?.startsWith('sk_test');

	return products
		.map((p) => {
			if (p.stripePriceId && priceMap.has(p.stripePriceId)) {
				const { formatted, value } = priceMap.get(p.stripePriceId)!;
				// Only override if valid
				if (value > 0) {
					return { ...p, price: formatted, priceValue: value };
				}
				// If value is 0 (failed fetch) AND we are in Test Mode, mark for removal
				if (isTestMode && value === 0) {
					return null;
				}
			}
			return p;
		})
		.filter((p): p is Product => p !== null);
}

// =============================================================================
// Commerce Module - Categories
// =============================================================================

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

// =============================================================================
// Commerce Module - Products
// =============================================================================

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

		// 处理 category 筛选（如 accessories, tops）
		await appendCategoryRelationFilterBySlug(pb, filters, options?.categorySlug, 'Category');

		// 处理 gender 筛选（如 mens, womens）
		await appendCategoryRelationFilterBySlug(pb, filters, options?.gender, 'Gender');

		// 处理 isFeatured 筛选
		if (options?.isFeatured) {
			filters.push('is_featured = true');
		}

		// 组合所有筛选条件
		const filter = filters.length > 0 ? filters.join(' && ') : undefined;

		const records = await pb.collection(Collections.Products).getFullList({
			filter: filter,
			expand: PRODUCT_EXPAND
		});

		// OPTIMIZATION: Use Bulk Fetch
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

/**
 * Resolve a product for checkout from either PocketBase record id or slug.
 * Returns both the real PocketBase record id and the mapped Product.
 */
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
