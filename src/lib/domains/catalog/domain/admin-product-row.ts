/**
 * Admin product row projection (pure domain).
 *
 * Maps an enriched storefront `Product` to the flat row rendered by the
 * `/admin/products` table. Stock aggregates from variant quantities so the
 * dashboard needs no N+1 variant queries.
 */
import type { Product } from './models';

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
}

export function toAdminProductRow(
	product: Product,
	recordId: string,
	isActive: boolean
): AdminProductRow {
	const variants = product.variants ?? [];
	return {
		id: recordId,
		slug: product.slug,
		title: product.title,
		image: product.image,
		price: product.price,
		priceValue: product.priceValue,
		totalStock: variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0),
		variantCount: variants.length,
		isActive
	};
}
