/**
 * Admin product management (server-only).
 *
 * Lists every product (including deactivated rows hidden from the
 * storefront) with pricing and stock aggregates, plus the instant
 * `is_active` toggle backing the admin switch.
 */
import { withAdmin } from '$shared/infrastructure/server';
import { Collections, type TypedPocketBase } from '$shared/infrastructure';
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
	throw { status: 409, message: `Slug 已被占用: ${base}` };
}

async function syncVariantsWithClient(
	pb: TypedPocketBase,
	productId: string,
	variants: NormalizedProductCreate['variants']
): Promise<void> {
	for (const variant of variants) {
		const payload = {
			product: productId,
			color: variant.color,
			size: variant.size,
			sku: variant.sku,
			stock_quantity: variant.stockQuantity
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
export async function createCatalogProduct(input: unknown): Promise<{ id: string; slug: string }> {
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
			const record = await pb.collection(Collections.Products).create({
				title: data.title,
				slug,
				description: data.description,
				is_active: data.isActive,
				stripe_product_id: stripeProductId,
				stripe_price_id: stripePriceId
			});
			await syncVariantsWithClient(pb, record.id, data.variants);
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
	priceDollars: number;
	currency: string;
	isActive: boolean;
	stripeProductId?: string;
	stripePriceId?: string;
	variants: Array<{
		id: string;
		color: string;
		size: string;
		sku: string;
		stockQuantity: number;
	}>;
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

			return {
				id: record.id,
				title: record.title,
				slug: record.slug,
				description: typeof record.description === 'string' ? record.description : '',
				priceDollars,
				currency,
				isActive: record.is_active !== false,
				stripeProductId: record.stripe_product_id || undefined,
				stripePriceId,
				variants: variants.map((v) => ({
					id: v.id,
					color: v.color,
					size: v.size,
					sku: v.sku,
					stockQuantity: v.stock_quantity
				}))
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
	input: unknown
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

		const updated = await pb.collection(Collections.Products).update(productId, payload);
		if (edit.variants !== undefined) {
			await syncVariantsWithClient(pb, productId, edit.variants);
		}
		return { id: updated.id, slug: (updated as ProductsResponse).slug, priceRolled };
	});
}
