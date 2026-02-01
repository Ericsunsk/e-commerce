import { pb, initAdmin } from './pocketbase';
import { stripe } from './stripe';
import { env } from '$env/dynamic/private';
import type { Product, Category } from '$lib/types';
import { DEFAULTS, isValidSlug, STOCK_STATUS } from '$lib/constants';
import type Stripe from 'stripe';
import { mapRecordToProduct, mapRecordToCategory, mapCategoriesFromExpand } from './mappers';
import { withAdmin } from '$lib/server/admin';
import {
	ProductsStockStatusOptions,
	type ProductsResponse,
	type CategoriesResponse,
	type ProductVariantsResponse
} from '$lib/pocketbase-types';
import { Collections } from '$lib/pocketbase-types';

// =============================================================================
// Stripe Enrichment Logic
// =============================================================================

/**
 * Deduct stock for a product
 * Implements Optimistic Concurrency Control (OCC) pattern
 * to handle inventory updates safely in serverless environments.
 */
export async function deductProductStock(
	productId: string,
	quantity: number,
	variantId?: string
): Promise<boolean> {
	const MAX_RETRIES = 3;
	let attempt = 0;

	while (attempt < MAX_RETRIES) {
		try {
			await initAdmin();

			if (variantId) {
				// 1. Fetch fresh record
				const variant = await pb.collection(Collections.ProductVariants).getOne(variantId);
				const currentStock = variant.stock_quantity || 0;

				// 2. Business Logic Check
				if (currentStock < quantity) {
					console.warn(
						`⚠️ Insufficient stock for variant ${variantId}. Current: ${currentStock}, Requested: ${quantity}`
					);
					return false; // Fatal error, do not retry
				}

				const newStock = currentStock - quantity;

				// 3. Optimistic Concurrency Check (Simulation)
				// We re-fetch immediately before update to minimize the race condition window.
				// In a perfect world, we'd send 'If-Match' headers, but PB SDK doesn't support this yet for Admin updates.
				const checkVariant = await pb
					.collection(Collections.ProductVariants)
					.getOne(variantId, { fields: 'updated,stock_quantity' });

				// CAST: generated types might miss system fields like updated depending on config
				const vUpdated = variant.updated;
				const cvUpdated = checkVariant.updated;

				if (cvUpdated !== vUpdated || checkVariant.stock_quantity < quantity) {
					console.warn(
						`Conflict detected for variant ${variantId}. Retrying... (${attempt + 1}/${MAX_RETRIES})`
					);
					attempt++;
					await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt))); // Exponential backoff
					continue;
				}

				// 4. Update
				await pb.collection(Collections.ProductVariants).update(variantId, {
					stock_quantity: newStock
				});

				console.log(
					`✅ Deducted ${quantity} from variant ${variantId} (Product: ${productId}). Remaining: ${newStock}`
				);
				return true;
			} else {
				// Fallback: Deduct from main product
				const product = await pb.collection(Collections.Products).getOne(productId);
				const currentStock = product.stock_quantity || 0;

				// ATOMICITY CHECK
				if (currentStock < quantity) {
					console.warn(
						`⚠️ Insufficient stock for product ${productId}. Current: ${currentStock}, Requested: ${quantity}`
					);
					return false;
				}

				const newStock = currentStock - quantity;

				// Determine new status
				let newStatus = product.stock_status;
				if (newStock === 0) {
					newStatus = STOCK_STATUS.OUT_OF_STOCK as ProductsStockStatusOptions;
				} else if (newStock <= 5) {
					newStatus = STOCK_STATUS.LOW_STOCK as ProductsStockStatusOptions;
				}

				// OCC Check
				const checkProduct = await pb
					.collection(Collections.Products)
					.getOne(productId, { fields: 'updated,stock_quantity' });

				const pUpdated = product.updated;
				const cpUpdated = checkProduct.updated;

				if (cpUpdated !== pUpdated || checkProduct.stock_quantity < quantity) {
					console.warn(
						`Conflict detected for product ${productId}. Retrying... (${attempt + 1}/${MAX_RETRIES})`
					);
					attempt++;
					await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
					continue;
				}

				await pb.collection(Collections.Products).update(productId, {
					stock_quantity: newStock,
					stock_status: newStatus
				});
				console.log(
					`✅ Deducted ${quantity} from product ${product.title}. Remaining: ${newStock}`
				);
				return true;
			}
		} catch (e: any) {
			console.error(
				`❌ Failed to deduct stock for product ${productId} (Variant: ${variantId}) - Attempt ${attempt + 1}:`,
				e instanceof Error ? e.message : String(e)
			);
			attempt++;
			if (attempt >= MAX_RETRIES) return false;
			await new Promise((r) => setTimeout(r, 200));
		}
	}

	return false;
}

/**
 * Sync product status from Stripe (Hybrid Driver)
 * Called by Webhook when product.updated or product.deleted is received.
 */
export async function syncProductStatusFromStripe(
	pbProductId: string,
	isActive: boolean
): Promise<boolean> {
	try {
		await initAdmin();

		const newStatus = isActive ? STOCK_STATUS.IN_STOCK : STOCK_STATUS.OUT_OF_STOCK;

		await pb.collection(Collections.Products).update(pbProductId, {
			stock_status: newStatus
		});

		return true;
	} catch (e) {
		return false;
	}
}

/**
 * Handle fully automatic creation from Stripe (Hybrid Driver)
 * 1. Creates a stub record in PocketBase
 * 2. Updates Stripe metadata with the new PB ID for future syncs
 */
export async function createProductFromStripe(
	stripeProduct: Stripe.Product
): Promise<ProductsResponse> {
	await initAdmin();

	const slug = stripeProduct.name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

	// Extract default_price (can be string ID or expanded object)
	let stripePriceId: string | undefined;
	if (typeof stripeProduct.default_price === 'string') {
		stripePriceId = stripeProduct.default_price;
	} else if (stripeProduct.default_price?.id) {
		stripePriceId = stripeProduct.default_price.id;
	}

	// 1. Create stub in PocketBase
	const record = await pb.collection(Collections.Products).create({
		title: stripeProduct.name,
		slug: slug,
		description: stripeProduct.description || '',
		stock_status: stripeProduct.active ? STOCK_STATUS.IN_STOCK : STOCK_STATUS.OUT_OF_STOCK,
		stripe_price_id: stripePriceId || '', // <-- NEW: Sync price ID
		has_variants: false,
		attributes: {
			source: 'stripe_auto_sync',
			synced_at: new Date().toISOString()
		}
	});

	// 2. IMPORTANT: Update Stripe metadata with the PB ID
	await stripe.products.update(stripeProduct.id, {
		metadata: {
			pb_product_id: record.id
		}
	});

	return record;
}

// Simple in-memory cache for Stripe prices
// Key: stripeId, Value: { data: result, expires: timestamp }
const priceCache = new Map<
	string,
	{ data: { formatted: string; value: number }; expires: number }
>();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache

async function fetchStripePrice(stripeId?: string): Promise<{ formatted: string; value: number }> {
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
		return { formatted: `${DEFAULTS.currencySymbol}195.00`, value: 195 };
	}

	try {
		let priceValue = 0;
		let currency = 'usd';

		if (stripeId.startsWith('price_')) {
			try {
				const price = await stripe.prices.retrieve(stripeId);
				priceValue = price.unit_amount || 0;
				currency = price.currency;
			} catch (e: any) {
				// Fallback for mismatched environments (Live ID in Test Env)
				// If we are in test mode and the error is "No such price", suppress the warning to reduce noise
				const isTestMode = env.STRIPE_SECRET_KEY?.startsWith('sk_test');
				if (!isTestMode || !e.message.includes('No such price')) {
					console.warn(
						`⚠️ Stripe price lookup failed for ${stripeId}: ${e.message}. Using fallback.`
					);
				}
				// Return a safe default to prevent crashing, or 0 if truly invalid
				// Ideally, we'd fetch the price from PocketBase 'display_price' as fallback,
				// but here we are in a pure Stripe enrichment context.
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

		const formatter = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase()
		});

		const result = {
			formatted: formatter.format(priceValue / 100),
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
		return { formatted: `${DEFAULTS.currencySymbol}195.00`, value: 195 };
	}
}

async function enrichProductWithStripe(product: Product): Promise<Product> {
	if (product.stripePriceId) {
		const { formatted, value } = await fetchStripePrice(product.stripePriceId);
		// Only override if we got a valid value
		if (value > 0) {
			return { ...product, price: formatted, priceValue: value };
		}
		// If Stripe fetch failed (value 0/fallback), keep the PB display_price if available
		// Note: product.priceValue from mapRecordToProduct uses 'display_price' from PB
		// So we just return the product as is.
	}
	return product;
}

// Optimized bulk fetch for Stripe prices
async function fetchStripePricesBulk(
	stripeIds: string[]
): Promise<Map<string, { formatted: string; value: number }>> {
	if (stripeIds.length === 0) return new Map();

	const result = new Map<string, { formatted: string; value: number }>();
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
			const mock = { formatted: `${DEFAULTS.currencySymbol}195.00`, value: 195 };
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

					const formatter = new Intl.NumberFormat('en-US', {
						style: 'currency',
						currency: currency.toUpperCase()
					});
					const data = {
						formatted: formatter.format(priceValue / 100),
						value: priceValue / 100
					};
					return { id, data };
				} catch (e) {
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

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
	if (!isValidSlug(slug)) return null;

	return withAdmin(async (pb) => {
		const record = await pb.collection(Collections.Categories).getFirstListItem(`slug="${slug}"`);
		return mapRecordToCategory(record);
	}, null);
}

// =============================================================================
// Commerce Module - Products
// =============================================================================

interface ProductFilterOptions {
	categorySlug?: string;
	gender?: string;
	isFeatured?: boolean;
}

export async function getProducts(options?: ProductFilterOptions): Promise<Product[]> {
	return withAdmin(async (pb) => {
		const filters: string[] = [];

		// 处理 category 筛选（如 accessories, tops）
		if (options?.categorySlug) {
			const filterCategory = await getCategoryBySlug(options.categorySlug);
			if (filterCategory) {
				filters.push(`category ?~ "${filterCategory.id}"`);
			} else {
				console.warn(`[getProducts] Category slug not found: ${options.categorySlug}`);
			}
		}

		// 处理 gender 筛选（如 mens, womens）
		if (options?.gender) {
			const genderCategory = await getCategoryBySlug(options.gender);
			if (genderCategory) {
				filters.push(`category ?~ "${genderCategory.id}"`);
			} else {
				console.warn(`[getProducts] Gender slug not found: ${options.gender}`);
			}
		}

		// 处理 isFeatured 筛选
		if (options?.isFeatured) {
			filters.push('is_featured = true');
		}

		// 组合所有筛选条件
		const filter = filters.length > 0 ? filters.join(' && ') : undefined;

		const records = await pb.collection(Collections.Products).getFullList({
			filter: filter,
			expand: 'category'
		});

		const basicProducts = records.map((r) => {
			const expandedCategories = mapCategoriesFromExpand(
				(r.expand as { category?: CategoriesResponse | CategoriesResponse[] })?.category
			);
			return mapRecordToProduct(r, expandedCategories);
		});

		// OPTIMIZATION: Use Bulk Fetch
		return enrichProductsBulk(basicProducts);
	}, []);
}

export async function getProductById(slug: string): Promise<Product | undefined> {
	if (!isValidSlug(slug)) {
		console.warn(`Invalid slug format: ${slug}`);
		return undefined;
	}

	return withAdmin(async (pb) => {
		const record = await pb.collection(Collections.Products).getFirstListItem(`slug="${slug}"`, {
			expand: 'category,product_variants(product)'
		});

		const categories = mapCategoriesFromExpand(
			(record.expand as { category?: CategoriesResponse | CategoriesResponse[] })?.category
		);
		const basicProduct = mapRecordToProduct(record, categories);
		return enrichProductWithStripe(basicProduct);
	}, undefined);
}

export async function getProductByPbId(id: string): Promise<Product | undefined> {
	return withAdmin(async (pb) => {
		try {
			// First try to get by PocketBase ID
			const record = await pb.collection(Collections.Products).getOne(id, {
				expand: 'category,product_variants(product)'
			});

			const categories = mapCategoriesFromExpand(
				(record.expand as { category?: CategoriesResponse | CategoriesResponse[] })?.category
			);
			const basicProduct = mapRecordToProduct(record, categories);
			return enrichProductWithStripe(basicProduct);
		} catch (e) {
			// If not found by ID, try by slug (since cart stores slug as id)
			// Rethrowing inside withAdmin logic is safe if we catch it here
			try {
				const record = await pb.collection(Collections.Products).getFirstListItem(`slug="${id}"`, {
					expand: 'category,product_variants(product)'
				});

				const categories = mapCategoriesFromExpand(
					(record.expand as { category?: CategoriesResponse | CategoriesResponse[] })?.category
				);
				const basicProduct = mapRecordToProduct(record, categories);
				return enrichProductWithStripe(basicProduct);
			} catch (slugError) {
				// Actually not found
				return undefined;
			}
		}
	}, undefined);
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
	if (!isValidSlug(categorySlug)) {
		return [];
	}

	return withAdmin(async (pb) => {
		const category = await getCategoryBySlug(categorySlug);
		if (!category) return [];

		const records = await pb.collection(Collections.Products).getFullList({
			filter: `category.id ?~ "${category.id}"`,
			expand: 'category'
		});

		const basicProducts = records.map((r) => {
			const expandedCategories = mapCategoriesFromExpand(
				(r.expand as { category?: CategoriesResponse | CategoriesResponse[] })?.category
			);
			return mapRecordToProduct(r, expandedCategories);
		});
		return enrichProductsBulk(basicProducts);
	}, []);
}

export async function getFeaturedProducts(): Promise<Product[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.Products).getFullList({
			filter: 'is_featured=true'
		});

		if (records.length === 0) {
			const fallbackRecords = await pb.collection(Collections.Products).getList(1, 6);
			const basicProducts = fallbackRecords.items.map((r) => mapRecordToProduct(r));
			return enrichProductsBulk(basicProducts);
		}

		const basicProducts = records.map((r) => mapRecordToProduct(r));
		return enrichProductsBulk(basicProducts);
	}, []);
}

export async function getRelatedProducts(currentId: string, limit = 4): Promise<Product[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.Products).getList(1, limit + 1);

		const filtered = records.items.filter((r) => r.slug !== currentId).slice(0, limit);

		const basicProducts = filtered.map((r) => mapRecordToProduct(r));
		return enrichProductsBulk(basicProducts);
	}, []);
}
