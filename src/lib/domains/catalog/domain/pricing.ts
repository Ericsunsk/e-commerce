/**
 * Compare-at pricing (pure domain).
 *
 * The optional strikethrough original price lives in
 * `attributes.compare_at_price` (dollars, same unit as `priceValue`) so no
 * PocketBase schema migration is needed. A badge renders only when the
 * original price is strictly above the selling price.
 */

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
