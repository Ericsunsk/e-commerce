/**
 * Admin product row projection (pure domain).
 *
 * Maps an enriched storefront `Product` to the flat row rendered by the
 * `/admin/products` table. Stock aggregates from variant quantities so the
 * dashboard needs no N+1 variant queries.
 */
import type { Product } from './models';

export interface AdminProductVariantSummary {
	id?: string;
	color: string;
	size: string;
	sku: string;
	stockQuantity: number;
}

export interface AdminProductCategorySummary {
	id: string;
	name: string;
	slug: string;
}

export interface AdminProductRow {
	id: string;
	slug: string;
	title: string;
	image: string;
	price: string;
	priceValue: number;
	totalStock: number;
	variantCount: number;
	isActive: boolean;
	isFeatured: boolean;
	categories: AdminProductCategorySummary[];
	variants: AdminProductVariantSummary[];
}

export function toAdminProductRow(
	product: Product,
	recordId: string,
	isActive: boolean
): AdminProductRow {
	const variants = product.variants ?? [];
	const categories: AdminProductCategorySummary[] = (product.categories ?? []).map((c) => ({
		id: c.id,
		name: c.title || c.name || c.slug,
		slug: c.slug
	}));

	return {
		id: recordId,
		slug: product.slug,
		title: product.title,
		image: product.image,
		price: product.price,
		priceValue: product.priceValue,
		totalStock: variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0),
		variantCount: variants.length,
		isActive,
		isFeatured: Boolean(product.isFeature),
		categories,
		variants: variants.map((v) => ({
			id: v.id,
			color: v.color,
			size: v.size,
			sku: v.sku,
			stockQuantity: Number(v.stockQuantity) || 0
		}))
	};
}
