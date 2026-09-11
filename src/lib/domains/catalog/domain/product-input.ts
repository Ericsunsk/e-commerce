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

	if (!color) throwProductIssue(`规格 ${index + 1}：颜色必填`);
	if (!size) throwProductIssue(`规格 ${index + 1}：尺码必填`);
	if (!sku) throwProductIssue(`规格 ${index + 1}：SKU 必填`);
	if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
		throwProductIssue(`规格 ${index + 1}：库存必须是不小于 0 的整数`);
	}
	const id = readString(item.id);
	return { ...(id ? { id } : {}), color, size, sku, stockQuantity };
}

function normalizeVariants(raw: unknown): NormalizedProductVariant[] {
	if (raw === undefined) return [];
	if (!Array.isArray(raw)) throwProductIssue('规格必须是数组');
	const variants = raw.map(normalizeVariant);
	const skus = new Set<string>();
	for (const variant of variants) {
		if (skus.has(variant.sku)) throwProductIssue(`SKU 重复：${variant.sku}`);
		skus.add(variant.sku);
	}
	return variants;
}

function normalizePriceDollars(raw: unknown, field = 'price'): number {
	const value = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
		throwProductIssue(`${field} 必须是正数金额`);
	}
	return Math.round(value * 100);
}

function normalizeCurrency(raw: unknown): string {
	const currency = readString(raw).toUpperCase() || 'USD';
	if (!(ADMIN_PRODUCT_CURRENCIES as readonly string[]).includes(currency)) {
		throwProductIssue(`币种必须是 ${ADMIN_PRODUCT_CURRENCIES.join('、')} 之一`);
	}
	return currency.toLowerCase();
}

function normalizeCategoryIds(raw: unknown): string[] {
	if (raw === undefined || raw === null) return [];
	let arr: unknown[] = [];
	if (Array.isArray(raw)) {
		arr = raw;
	} else if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) arr = parsed;
			} catch {
				arr = trimmed ? [trimmed] : [];
			}
		} else if (trimmed) {
			arr = [trimmed];
		}
	}
	const clean = arr
		.map((item) => (typeof item === 'string' ? item.trim() : ''))
		.filter((id) => id.length > 0);
	return Array.from(new Set(clean));
}

export interface NormalizedProductCreate {
	title: string;
	slug: string;
	description: string;
	unitAmountCents: number;
	currency: string;
	isActive: boolean;
	isFeatured: boolean;
	category: string[];
	variants: NormalizedProductVariant[];
}

/** Validate the admin creation payload (slug derived from title). */
export function normalizeProductCreate(input: unknown): NormalizedProductCreate {
	if (!input || typeof input !== 'object') throwProductIssue('商品数据格式错误');
	const data = input as Record<string, unknown>;

	const title = readString(data.title);
	if (title.length < 2 || title.length > 120) {
		throwProductIssue('标题长度需为 2–120 个字符');
	}

	return {
		title,
		slug: slugifyTitle(title),
		description: readString(data.description),
		unitAmountCents: normalizePriceDollars(data.price),
		currency: normalizeCurrency(data.currency),
		isActive: data.is_active === undefined ? true : data.is_active === true,
		isFeatured: data.is_featured === true,
		category: normalizeCategoryIds(data.category),
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
	isFeatured?: boolean;
	category?: string[];
	variants?: NormalizedProductVariant[];
}

/** Validate the admin edit payload (all fields optional). */
export function normalizeProductEdit(input: unknown): NormalizedProductEdit {
	if (!input || typeof input !== 'object') throwProductIssue('商品数据格式错误');
	const data = input as Record<string, unknown>;
	const edit: NormalizedProductEdit = {};

	if (data.title !== undefined) {
		const title = readString(data.title);
		if (title.length < 2 || title.length > 120) {
			throwProductIssue('标题长度需为 2–120 个字符');
		}
		edit.title = title;
		edit.slug = slugifyTitle(title);
	}
	if (data.description !== undefined) edit.description = readString(data.description);
	if (data.price !== undefined) edit.unitAmountCents = normalizePriceDollars(data.price);
	if (data.currency !== undefined) edit.currency = normalizeCurrency(data.currency);
	if (data.is_active !== undefined) edit.isActive = data.is_active === true;
	if (data.is_featured !== undefined) edit.isFeatured = data.is_featured === true;
	if (data.category !== undefined) edit.category = normalizeCategoryIds(data.category);
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
