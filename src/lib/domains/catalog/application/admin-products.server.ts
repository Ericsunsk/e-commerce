/**
 * Admin product management (server-only).
 *
 * Lists every product (including deactivated rows hidden from the
 * storefront) with pricing and stock aggregates, plus the instant
 * `is_active` toggle backing the admin switch.
 */
import { withAdmin } from '$shared/infrastructure/server';
import { Collections, type TypedPocketBase } from '$shared/infrastructure';
import { getFileUrl } from '$shared/kernel';
import { mapRecordToProduct } from '../infrastructure/product-mapper.server';
import { enrichProductsBulk } from '../infrastructure/stripe-pricing.server';
import {
	createProductWithStripe,
	rollProductPrice,
	type StripeProvisioningClient
} from '../infrastructure/stripe-sync.server';
import { getStripeClient } from '$domains/payment/server';
import {
	normalizeProductCreate,
	normalizeProductEdit,
	needsPriceRoll,
	type NormalizedProductCreate,
	type NormalizedProductEdit
} from '../domain/product-input';
import { toAdminProductRow, type AdminProductRow } from '../domain/admin-product-row';
import type { ProductsResponse, ProductVariantsResponse } from '$shared/infrastructure';

const PRODUCT_EXPAND = 'category,product_variants(product)';

export type { AdminProductRow };

/**
 * Collect per-variant gallery uploads from multipart fields named
 * `gallery:<sku>` (repeated fields accumulate).
 */
export function extractGalleryUploads(formData: FormData): Map<string, File[]> {
	const uploads = new Map<string, File[]>();
	for (const [key, value] of formData.entries()) {
		if (!key.startsWith('gallery:')) continue;
		const sku = key.slice('gallery:'.length);
		if (!sku || !(value instanceof File) || value.size === 0) continue;
		const list = uploads.get(sku) ?? [];
		list.push(value);
		uploads.set(sku, list);
	}
	return uploads;
}

async function fetchAllProductsWithClient(pb: TypedPocketBase): Promise<ProductsResponse[]> {
	return pb.collection(Collections.Products).getFullList({ expand: PRODUCT_EXPAND });
}

export async function listAdminProducts(): Promise<AdminProductRow[]> {
	return withAdmin(async (pb) => {
		const records = await fetchAllProductsWithClient(pb);
		const products = records.map((record) => mapRecordToProduct(record));
		const enriched = await enrichProductsBulk(products);
		const byId = new Map(enriched.map((product) => [product.id, product]));

		return records.map((record) => {
			const product = byId.get(record.slug || record.id) ?? mapRecordToProduct(record);
			return toAdminProductRow(product, record.id, record.is_active !== false);
		});
	}, []);
}

export async function setProductActive(
	productId: string,
	isActive: boolean
): Promise<{ id: string; is_active: boolean }> {
	return withAdmin(async (pb) => {
		const updated = await pb.collection(Collections.Products).update(productId, {
			is_active: isActive
		});
		return { id: updated.id, is_active: (updated as ProductsResponse).is_active !== false };
	});
}

export async function setProductFeatured(
	productId: string,
	isFeatured: boolean
): Promise<{ id: string; is_featured: boolean }> {
	return withAdmin(async (pb) => {
		const updated = await pb.collection(Collections.Products).update(productId, {
			is_featured: isFeatured
		});
		return { id: updated.id, is_featured: !!(updated as ProductsResponse).is_featured };
	});
}

/** Admin variant stock rollup helper (reused by the dashboard). */
export async function listVariantStockWithClient(
	pb: TypedPocketBase
): Promise<ProductVariantsResponse[]> {
	return pb.collection(Collections.ProductVariants).getFullList();
}

/** Live Stripe adapter for provisioning (production wiring of the injected seam). */
async function liveProvisioningClient(): Promise<StripeProvisioningClient> {
	const stripe = await getStripeClient();
	return {
		products: {
			create: (params) => stripe.products.create(params as never) as Promise<{ id: string }>,
			update: (id, params) => stripe.products.update(id, params as never)
		},
		prices: {
			create: (params) => stripe.prices.create(params as never) as Promise<{ id: string }>,
			update: (id, params) => stripe.prices.update(id, params as never),
			retrieve: (id) =>
				stripe.prices.retrieve(id) as Promise<{
					id: string;
					unit_amount: number | null;
					currency: string;
				}>
		}
	};
}

async function ensureUniqueSlug(pb: TypedPocketBase, base: string): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
		try {
			await pb.collection(Collections.Products).getFirstListItem(`slug="${candidate}"`, {
				fields: 'id'
			});
		} catch {
			return candidate; // 404 → available.
		}
	}
	// Fallback to random unique suffix if base has 10+ collisions
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	return `${base}-${randomSuffix}`;
}

async function syncVariantsWithClient(
	pb: TypedPocketBase,
	productId: string,
	variants: NormalizedProductCreate['variants'],
	galleryUploads?: Map<string, File[]>
): Promise<void> {
	for (const variant of variants) {
		const uploads = galleryUploads?.get(variant.sku) ?? [];
		if (variant.gallery.length + uploads.length > 4) {
			throw { status: 400, message: `规格 ${variant.sku} 图集最多 4 张` };
		}
		const payload: Record<string, unknown> = {
			product: productId,
			color: variant.color,
			size: variant.size,
			sku: variant.sku,
			stock_quantity: variant.stockQuantity,
			...(variant.colorSwatch ? { color_swatch: variant.colorSwatch } : {}),
			// Retained filenames + fresh uploads ride one update; the SDK
			// converts File objects to multipart automatically.
			gallery_images: [...variant.gallery, ...uploads]
		};
		if (variant.id) {
			await pb.collection(Collections.ProductVariants).update(variant.id, payload);
		} else {
			await pb.collection(Collections.ProductVariants).create(payload);
		}
	}
}

/**
 * Admin: create a product end-to-end (Stripe provisioning → PB record →
 * variants). Stripe artifacts are rolled back when persistence fails.
 */
export async function createCatalogProduct(
	input: unknown,
	mainImageFile?: File | null,
	galleryUploads?: Map<string, File[]>
): Promise<{ id: string; slug: string }> {
	const data: NormalizedProductCreate = normalizeProductCreate(input);
	const client = await liveProvisioningClient();

	const { productId: stripeProductId, priceId: stripePriceId } = await createProductWithStripe(
		client,
		{
			name: data.title,
			description: data.description || undefined,
			unitAmountCents: data.unitAmountCents,
			currency: data.currency
		}
	);

	try {
		return await withAdmin(async (pb) => {
			const slug = await ensureUniqueSlug(pb, data.slug);
			const payload: Record<string, unknown> = {
				title: data.title,
				slug,
				description: data.description,
				is_active: data.isActive,
				is_featured: data.isFeatured,
				category: data.category,
				stripe_product_id: stripeProductId,
				stripe_price_id: stripePriceId
			};
			const attrs: Record<string, unknown> = {};
			if (data.compareAtCents) attrs.compare_at_price = data.compareAtCents / 100;
			if (data.material) attrs.material = data.material;
			if (data.care) attrs.care = data.care;
			if (data.details.length > 0) attrs.details = data.details;

			const variantPricing: Record<string, { price?: number; compareAt?: number }> = {};
			for (const v of data.variants) {
				if (v.price !== undefined || v.compareAt !== undefined) {
					variantPricing[v.sku] = {
						...(v.price !== undefined ? { price: v.price } : {}),
						...(v.compareAt !== undefined ? { compareAt: v.compareAt } : {})
					};
				}
			}
			if (Object.keys(variantPricing).length > 0) {
				attrs.variant_pricing = variantPricing;
			}

			if (Object.keys(attrs).length > 0) payload.attributes = attrs;

			let effectiveMainImage = mainImageFile;
			if (!effectiveMainImage && galleryUploads) {
				for (const v of data.variants) {
					const files = galleryUploads.get(v.sku);
					if (files && files.length > 0) {
						effectiveMainImage = files[0];
						break;
					}
				}
			}
			if (effectiveMainImage) {
				payload.main_image = effectiveMainImage;
			}
			const record = await pb.collection(Collections.Products).create(payload);
			await syncVariantsWithClient(pb, record.id, data.variants, galleryUploads);
			return { id: record.id, slug };
		});
	} catch (err: unknown) {
		try {
			await client.products.update(stripeProductId, { active: false });
		} catch {
			// Best-effort rollback; the persistence error carries the cause.
		}
		throw err;
	}
}

export interface AdminProductEdit {
	id: string;
	title: string;
	slug: string;
	description: string;
	material: string;
	care: string;
	details: string[];
	priceDollars: number;
	compareAtDollars: number | null;
	currency: string;
	isActive: boolean;
	isFeatured: boolean;
	mainImage?: string;
	categoryIds: string[];
	stripeProductId?: string;
	stripePriceId?: string;
	variants: Array<{
		id: string;
		color: string;
		colorSwatch?: string;
		size: string;
		sku: string;
		stockQuantity: number;
		price?: number;
		compareAt?: number;
		gallery: string[];
	}>;
}

/** Read the compare-at price (dollars) from the attributes JSON blob. */
function readCompareAtDollars(attributes: unknown): number | null {
	if (!attributes || typeof attributes !== 'object') return null;
	const raw = (attributes as Record<string, unknown>).compare_at_price;
	const value = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(value) || value <= 0) return null;
	return value;
}

/** Admin: load one product with editable fields and current Stripe money. */
export async function getAdminProductForEdit(productId: string): Promise<AdminProductEdit | null> {
	return withAdmin(async (pb) => {
		try {
			const record = (await pb
				.collection(Collections.Products)
				.getOne(productId)) as ProductsResponse & { description?: string };
			const variants = (await pb.collection(Collections.ProductVariants).getFullList({
				filter: `product="${productId}"`
			})) as ProductVariantsResponse[];

			let priceDollars = 0;
			let currency = 'usd';
			const attrs =
				record.attributes && typeof record.attributes === 'object'
					? (record.attributes as Record<string, unknown>)
					: ({} as Record<string, unknown>);
			const stripePriceId = record.stripe_price_id || undefined;
			if (stripePriceId) {
				try {
					const price = await (await liveProvisioningClient()).prices.retrieve(stripePriceId);
					priceDollars = (price.unit_amount ?? 0) / 100;
					currency = price.currency || 'usd';
				} catch {
					// Fall through with zero price; saving provisions fresh.
				}
			}

			const variantPricing =
				attrs.variant_pricing && typeof attrs.variant_pricing === 'object'
					? (attrs.variant_pricing as Record<string, { price?: number; compareAt?: number }>)
					: {};

			return {
				id: record.id,
				title: record.title,
				slug: record.slug,
				description: typeof record.description === 'string' ? record.description : '',
				material: typeof attrs.material === 'string' ? attrs.material : '',
				care: typeof attrs.care === 'string' ? attrs.care : '',
				details: Array.isArray(attrs.details)
					? (attrs.details as unknown[]).filter((d): d is string => typeof d === 'string')
					: [],
				priceDollars,
				compareAtDollars: readCompareAtDollars(record.attributes),
				currency,
				isActive: record.is_active !== false,
				isFeatured: record.is_featured === true,
				mainImage: record.main_image
					? getFileUrl(record.collectionId || 'products', record.id, record.main_image)
					: undefined,
				categoryIds: Array.isArray(record.category) ? record.category : [],
				stripeProductId: record.stripe_product_id || undefined,
				stripePriceId,
				variants: variants.map((v) => {
					const vp = variantPricing[v.sku];
					return {
						id: v.id,
						color: v.color,
						colorSwatch: v.color_swatch || undefined,
						size: v.size,
						sku: v.sku,
						stockQuantity: v.stock_quantity,
						price: vp?.price !== undefined ? vp.price : priceDollars || undefined,
						compareAt: vp?.compareAt !== undefined ? vp.compareAt : (readCompareAtDollars(record.attributes) ?? undefined),
						gallery: Array.isArray(v.gallery_images) ? v.gallery_images.filter(Boolean) : []
					};
				})
			};
		} catch {
			return null;
		}
	}, null);
}

/**
 * Admin: update a product. A changed amount/currency triggers Auto Price
 * Roll (new Stripe Price, old deactivated, PB pointer updated).
 */
export async function updateCatalogProduct(
	productId: string,
	input: unknown,
	mainImageFile?: File | null | 'CLEAR',
	galleryUploads?: Map<string, File[]>
): Promise<{ id: string; slug: string; priceRolled: boolean }> {
	const edit: NormalizedProductEdit = normalizeProductEdit(input);
	const client = await liveProvisioningClient();

	return withAdmin(async (pb) => {
		const record = (await pb
			.collection(Collections.Products)
			.getOne(productId)) as ProductsResponse & { description?: string };

		let stripeProductId = record.stripe_product_id || undefined;
		let stripePriceId = record.stripe_price_id || undefined;
		let priceRolled = false;

		if (!stripeProductId) {
			const provisioned = await client.products.create({
				name: edit.title ?? record.title,
				metadata: { provisioned_by: 'admin-portal' }
			});
			stripeProductId = provisioned.id;
		}

		const nextUnitAmount =
			edit.unitAmountCents ??
			(stripePriceId
				? ((await client.prices.retrieve(stripePriceId).catch(() => null))?.unit_amount ?? 0)
				: 0);
		const nextCurrency = (edit.currency ?? 'usd').toLowerCase();

		if (edit.unitAmountCents !== undefined || edit.currency !== undefined) {
			const current = stripePriceId
				? await client.prices.retrieve(stripePriceId).catch(() => null)
				: null;
			if (
				needsPriceRoll(
					current
						? {
								priceId: stripePriceId,
								unitAmountCents: current.unit_amount ?? 0,
								currency: current.currency
							}
						: null,
					{ unitAmountCents: nextUnitAmount, currency: nextCurrency }
				)
			) {
				const rolled = await rollProductPrice(client, {
					productId: stripeProductId,
					oldPriceId: stripePriceId,
					unitAmountCents: nextUnitAmount,
					currency: nextCurrency
				});
				stripePriceId = rolled.priceId;
				priceRolled = rolled.rolled;
			}
		}

		const payload: Record<string, unknown> = {
			stripe_product_id: stripeProductId,
			...(stripePriceId ? { stripe_price_id: stripePriceId } : {})
		};
		if (edit.title !== undefined) payload.title = edit.title;
		if (edit.slug !== undefined && edit.slug !== record.slug) {
			payload.slug = await ensureUniqueSlug(pb, edit.slug);
		}
		if (edit.description !== undefined) payload.description = edit.description;
		if (edit.isActive !== undefined) payload.is_active = edit.isActive;
		if (edit.isFeatured !== undefined) payload.is_featured = edit.isFeatured;
		if (edit.category !== undefined) payload.category = edit.category;
		if (
			edit.compareAtCents !== undefined ||
			edit.material !== undefined ||
			edit.care !== undefined ||
			edit.details !== undefined ||
			edit.variants !== undefined
		) {
			const attrs =
				record.attributes && typeof record.attributes === 'object'
					? { ...(record.attributes as Record<string, unknown>) }
					: {};
			if (edit.compareAtCents !== undefined) {
				if (edit.compareAtCents === null || edit.compareAtCents <= 0) {
					delete attrs.compare_at_price;
				} else {
					attrs.compare_at_price = edit.compareAtCents / 100;
				}
			}
			if (edit.material !== undefined) {
				if (edit.material) attrs.material = edit.material;
				else delete attrs.material;
			}
			if (edit.care !== undefined) {
				if (edit.care) attrs.care = edit.care;
				else delete attrs.care;
			}
			if (edit.details !== undefined) {
				if (edit.details.length > 0) attrs.details = edit.details;
				else delete attrs.details;
			}
			if (edit.variants !== undefined) {
				const variantPricing: Record<string, { price?: number; compareAt?: number }> = {};
				for (const v of edit.variants) {
					if (v.price !== undefined || v.compareAt !== undefined) {
						variantPricing[v.sku] = {
							...(v.price !== undefined ? { price: v.price } : {}),
							...(v.compareAt !== undefined ? { compareAt: v.compareAt } : {})
						};
					}
				}
				if (Object.keys(variantPricing).length > 0) {
					attrs.variant_pricing = variantPricing;
				} else {
					delete attrs.variant_pricing;
				}
			}
			payload.attributes = attrs;
		}

		if (
			mainImageFile === 'CLEAR' ||
			(input &&
				typeof input === 'object' &&
				(input as Record<string, unknown>).main_image_clear === true)
		) {
			payload.main_image = null;
		} else if (mainImageFile instanceof File) {
			payload.main_image = mainImageFile;
		} else if (galleryUploads) {
			for (const v of edit.variants ?? []) {
				const files = galleryUploads.get(v.sku);
				if (files && files.length > 0) {
					payload.main_image = files[0];
					break;
				}
			}
		}

		const updated = await pb.collection(Collections.Products).update(productId, payload);
		if (edit.variants !== undefined) {
			await syncVariantsWithClient(pb, productId, edit.variants, galleryUploads);
		}
		return { id: updated.id, slug: (updated as ProductsResponse).slug, priceRolled };
	});
}

/**
 * Admin: delete a product end-to-end. Variants are removed first (PB has no
 * cascade), then the product record; the Stripe product is deactivated
 * best-effort so it stops being purchasable while history stays intact.
 */
export async function deleteCatalogProduct(productId: string): Promise<{ id: string }> {
	return withAdmin(async (pb) => {
		let stripeProductId: string | undefined;
		try {
			const record = (await pb
				.collection(Collections.Products)
				.getOne(productId)) as ProductsResponse;
			stripeProductId = record.stripe_product_id || undefined;
		} catch {
			throw { status: 404, message: '商品不存在' };
		}

		const variants = (await pb.collection(Collections.ProductVariants).getFullList({
			filter: `product="${productId}"`,
			fields: 'id'
		})) as ProductVariantsResponse[];
		for (const variant of variants) {
			try {
				await pb.collection(Collections.ProductVariants).delete(variant.id);
			} catch (err: unknown) {
				console.error('[deleteCatalogProduct] variant delete failed:', variant.id);
				throw err;
			}
		}

		await pb.collection(Collections.Products).delete(productId);

		if (stripeProductId) {
			try {
				const client = await liveProvisioningClient();
				await client.products.update(stripeProductId, { active: false });
			} catch {
				// Best-effort: PB record is already gone; Stripe cleanup is manual.
			}
		}
		return { id: productId };
	});
}
