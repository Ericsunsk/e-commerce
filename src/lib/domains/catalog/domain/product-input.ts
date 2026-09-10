/**
 * Admin product input modeling (pure domain).
 *
 * Validates creation/edit payloads, derives URL slugs, and decides when a
 * price change requires a Stripe Auto Price Roll (Stripe prices are
 * immutable, so a new Price must be provisioned and the old one deactivated).
 */

export const ADMIN_PRODUCT_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'] as const;

/** `My Tee 2.0` → `my-tee-2-0` (falls back to `product` when empty). */
export function slugifyTitle(title: string): string {
	const slug = title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');
	return slug || 'product';
}

function throwProductIssue(message: string): never {
	throw { status: 400, message };
}

function readString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

export interface NormalizedProductVariant {
	id?: string;
	color: string;
	size: string;
	sku: string;
	stockQuantity: number;
}

function normalizeVariant(raw: unknown, index: number): NormalizedProductVariant {
	const item = (raw ?? {}) as Record<string, unknown>;
	const color = readString(item.color);
	const size = readString(item.size);
	const sku = readString(item.sku);
	const stockRaw = item.stockQuantity;
	const stockQuantity =
		typeof stockRaw === 'number'
			? stockRaw
			: Number.isFinite(Number(stockRaw))
				? Number(stockRaw)
				: NaN;

	if (!color) throwProductIssue(`Variant ${index + 1}: color is required`);
	if (!size) throwProductIssue(`Variant ${index + 1}: size is required`);
	if (!sku) throwProductIssue(`Variant ${index + 1}: sku is required`);
	if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
		throwProductIssue(`Variant ${index + 1}: stockQuantity must be an integer >= 0`);
	}
	const id = readString(item.id);
	return { ...(id ? { id } : {}), color, size, sku, stockQuantity };
}

function normalizeVariants(raw: unknown): NormalizedProductVariant[] {
	if (raw === undefined) return [];
	if (!Array.isArray(raw)) throwProductIssue('Variants must be an array');
	const variants = raw.map(normalizeVariant);
	const skus = new Set<string>();
	for (const variant of variants) {
		if (skus.has(variant.sku)) throwProductIssue(`Duplicate sku: ${variant.sku}`);
		skus.add(variant.sku);
	}
	return variants;
}

function normalizePriceDollars(raw: unknown, field = 'price'): number {
	const value = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
		throwProductIssue(`${field} must be a positive amount`);
	}
	return Math.round(value * 100);
}

function normalizeCurrency(raw: unknown): string {
	const currency = readString(raw).toUpperCase() || 'USD';
	if (!(ADMIN_PRODUCT_CURRENCIES as readonly string[]).includes(currency)) {
		throwProductIssue(`Currency must be one of ${ADMIN_PRODUCT_CURRENCIES.join(', ')}`);
	}
	return currency.toLowerCase();
}

export interface NormalizedProductCreate {
	title: string;
	slug: string;
	description: string;
	unitAmountCents: number;
	currency: string;
	isActive: boolean;
	variants: NormalizedProductVariant[];
}

/** Validate the admin creation payload (slug derived from title). */
export function normalizeProductCreate(input: unknown): NormalizedProductCreate {
	if (!input || typeof input !== 'object') throwProductIssue('Invalid product payload');
	const data = input as Record<string, unknown>;

	const title = readString(data.title);
	if (title.length < 2 || title.length > 120) {
		throwProductIssue('Title must be 2–120 characters');
	}

	return {
		title,
		slug: slugifyTitle(title),
		description: readString(data.description),
		unitAmountCents: normalizePriceDollars(data.price),
		currency: normalizeCurrency(data.currency),
		isActive: data.is_active === undefined ? true : data.is_active === true,
		variants: normalizeVariants(data.variants)
	};
}

export interface NormalizedProductEdit {
	title?: string;
	slug?: string;
	description?: string;
	unitAmountCents?: number;
	currency?: string;
	isActive?: boolean;
	variants?: NormalizedProductVariant[];
}

/** Validate the admin edit payload (all fields optional). */
export function normalizeProductEdit(input: unknown): NormalizedProductEdit {
	if (!input || typeof input !== 'object') throwProductIssue('Invalid product payload');
	const data = input as Record<string, unknown>;
	const edit: NormalizedProductEdit = {};

	if (data.title !== undefined) {
		const title = readString(data.title);
		if (title.length < 2 || title.length > 120) {
			throwProductIssue('Title must be 2–120 characters');
		}
		edit.title = title;
		edit.slug = slugifyTitle(title);
	}
	if (data.description !== undefined) edit.description = readString(data.description);
	if (data.price !== undefined) edit.unitAmountCents = normalizePriceDollars(data.price);
	if (data.currency !== undefined) edit.currency = normalizeCurrency(data.currency);
	if (data.is_active !== undefined) edit.isActive = data.is_active === true;
	if (data.variants !== undefined) edit.variants = normalizeVariants(data.variants);

	return edit;
}

export interface CurrentStripePrice {
	priceId?: string | null;
	unitAmountCents: number;
	currency: string;
}

/**
 * A roll is required when the amount/currency differs — or when no usable
 * price exists yet. Identical money never provisions (idempotent edits).
 */
export function needsPriceRoll(
	current: CurrentStripePrice | null,
	next: { unitAmountCents: number; currency: string }
): boolean {
	if (!current || !current.priceId) return true;
	return (
		current.unitAmountCents !== next.unitAmountCents ||
		current.currency.toLowerCase() !== next.currency.toLowerCase()
	);
}
