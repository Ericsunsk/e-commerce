/**
 * Compare-at pricing (pure domain).
 *
 * The optional strikethrough original price lives in
 * `attributes.compare_at_price` (dollars, same unit as `priceValue`) so no
 * PocketBase schema migration is needed. A badge renders only when the
 * original price is strictly above the selling price.
 */

import type { VariantPricing } from './models';

interface PricedProduct {
	priceValue?: number;
	attributes?: Record<string, unknown> | null;
}

/** Original price in dollars, or null when unset/invalid. */
export function getCompareAtPrice(product: PricedProduct): number | null {
	const raw = product.attributes?.compare_at_price;
	const value = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(value) || value <= 0) return null;
	return value;
}

/**
 * Discount percent (rounded) when a valid compare-at price sits above the
 * selling price; otherwise null (no badge).
 */
export function getDiscountPercent(product: PricedProduct): number | null {
	const price = Number(product.priceValue);
	const compareAt = getCompareAtPrice(product);
	if (!Number.isFinite(price) || price <= 0 || compareAt === null) return null;
	if (compareAt <= price) return null;
	return Math.round(((compareAt - price) / compareAt) * 100);
}

/**
 * Per-SKU price overrides, as stored in `attributes.variant_pricing`.
 *
 * Aliased to the model's schema-derived type so the shape has one owner —
 * `models.ts`. `readVariantPricing` is still the only reader: it validates
 * against this shape and *drops* malformed entries instead of trusting them.
 */
export type VariantPricingMap = VariantPricing;

function readPositiveNumber(raw: unknown): number | undefined {
	if (raw === undefined || raw === null || raw === '') return undefined;
	const value = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(value) || value <= 0) return undefined;
	return value;
}

/**
 * Read the variant price overrides off a product's attributes. Malformed
 * entries are dropped rather than thrown on — a partially-bad map must not
 * break the storefront render or take the whole product offline.
 */
export function readVariantPricing(attributes: unknown): VariantPricingMap {
	if (!attributes || typeof attributes !== 'object') return {};
	const raw = (attributes as Record<string, unknown>).variant_pricing;
	if (!raw || typeof raw !== 'object') return {};

	const out: VariantPricingMap = {};
	for (const [sku, entry] of Object.entries(raw as Record<string, unknown>)) {
		if (!sku || !entry || typeof entry !== 'object') continue;
		const record = entry as Record<string, unknown>;
		const price = readPositiveNumber(record.price);
		const compareAt = readPositiveNumber(record.compareAt);
		if (price === undefined && compareAt === undefined) continue;
		out[sku] = {
			...(price !== undefined ? { price } : {}),
			...(compareAt !== undefined ? { compareAt } : {})
		};
	}
	return out;
}

/**
 * Selling price in dollars for one variant, or `undefined` when it inherits
 * the product-level price. Checkout must use this so a colour/size with its
 * own price is actually charged that price.
 */
export function getVariantPrice(
	variant: { sku?: string },
	pricing: VariantPricingMap
): number | undefined {
	if (!variant.sku) return undefined;
	return pricing[variant.sku]?.price;
}
