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
	colorSwatch?: string;
	size: string;
	sku: string;
	stockQuantity: number;
	price?: number;
	compareAt?: number;
	/** Retained gallery filenames (uploaded files arrive out-of-band). */
	gallery: string[];
}

function normalizeGallery(raw: unknown, index: number): string[] {
	if (raw === undefined) return [];
	if (!Array.isArray(raw)) throwProductIssue(`规格 ${index + 1}：图集必须是数组`);
	if (raw.length > 4) throwProductIssue(`规格 ${index + 1}：图集最多 4 张`);
	const names = raw.map((name) => (typeof name === 'string' ? name.trim() : ''));
	if (names.some((name) => !name)) throwProductIssue(`规格 ${index + 1}：图集文件名无效`);
	return names;
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
	const colorSwatch = readString(item.colorSwatch ?? item.color_swatch);

	const priceRaw = item.price;
	let price: number | undefined;
	if (priceRaw !== undefined && priceRaw !== null && priceRaw !== '') {
		const p = typeof priceRaw === 'number' ? priceRaw : Number(priceRaw);
		if (Number.isFinite(p) && p >= 0) price = Math.round(p * 100) / 100;
	}

	const compareAtRaw = item.compareAt ?? item.compare_at ?? item.compare_at_price;
	let compareAt: number | undefined;
	if (compareAtRaw !== undefined && compareAtRaw !== null && compareAtRaw !== '') {
		const cp = typeof compareAtRaw === 'number' ? compareAtRaw : Number(compareAtRaw);
		if (Number.isFinite(cp) && cp >= 0) compareAt = Math.round(cp * 100) / 100;
	}

	return {
		...(id ? { id } : {}),
		color,
		...(colorSwatch ? { colorSwatch } : {}),
		size,
		sku,
		stockQuantity,
		...(price !== undefined ? { price } : {}),
		...(compareAt !== undefined ? { compareAt } : {}),
		gallery: normalizeGallery(item.gallery, index)
	};
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

/**
 * Compare-at price in cents; null clears it. Zero/empty means "no strikethrough".
 * Upper bound intentionally loose — the storefront only badges when it sits
 * strictly above the selling price.
 */
function normalizeCompareAtCents(raw: unknown): number | null {
	if (raw === undefined || raw === null || raw === '') return null;
	const value = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
		throwProductIssue('划线原价必须是不小于 0 的金额');
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

function normalizeMaterialField(raw: unknown, field: string, max: number): string {
	const value = readString(raw);
	if (value.length > max) throwProductIssue(`${field}最多 ${max} 个字符`);
	return value;
}

/** Detail bullets: trimmed, empties dropped, capped at 20 items. */
function normalizeDetailBullets(raw: unknown): string[] {
	if (raw === undefined || raw === null || raw === '') return [];
	const arr = Array.isArray(raw) ? raw : [raw];
	const items = arr
		.map((item) => (typeof item === 'string' ? item.trim() : ''))
		.filter((item) => item.length > 0);
	if (items.length > 20) throwProductIssue('细节条目最多 20 条');
	if (items.some((item) => item.length > 300)) throwProductIssue('单条细节最多 300 个字符');
	return items;
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
	material: string;
	care: string;
	details: string[];
	unitAmountCents: number;
	compareAtCents: number | null;
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

	const variants = normalizeVariants(data.variants);
	const fallbackPrice = variants.reduce<number | undefined>((min, v) => {
		if (v.price === undefined) return min;
		return min === undefined ? v.price : Math.min(min, v.price);
	}, undefined);
	const effectivePriceRaw =
		data.price !== undefined && data.price !== null && data.price !== ''
			? data.price
			: fallbackPrice;
	const fallbackCompareAt = variants.reduce<number | undefined>((min, v) => {
		if (v.compareAt === undefined) return min;
		return min === undefined ? v.compareAt : Math.min(min, v.compareAt);
	}, undefined);
	const effectiveCompareAtRaw =
		data.compare_at_price !== undefined && data.compare_at_price !== null && data.compare_at_price !== ''
			? data.compare_at_price
			: fallbackCompareAt;

	return {
		title,
		slug: slugifyTitle(title),
		description: readString(data.description),
		material: normalizeMaterialField(data.material, '面料材质', 300),
		care: normalizeMaterialField(data.care, '护理说明', 500),
		details: normalizeDetailBullets(data.details),
		unitAmountCents: normalizePriceDollars(effectivePriceRaw),
		compareAtCents: normalizeCompareAtCents(effectiveCompareAtRaw),
		currency: normalizeCurrency(data.currency),
		isActive: data.is_active === undefined ? true : data.is_active === true,
		isFeatured: data.is_featured === true,
		category: normalizeCategoryIds(data.category),
		variants
	};
}

export interface NormalizedProductEdit {
	title?: string;
	slug?: string;
	description?: string;
	material?: string;
	care?: string;
	details?: string[];
	unitAmountCents?: number;
	compareAtCents?: number | null;
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
	if (data.material !== undefined)
		edit.material = normalizeMaterialField(data.material, '面料材质', 300);
	if (data.care !== undefined) edit.care = normalizeMaterialField(data.care, '护理说明', 500);
	if (data.details !== undefined) edit.details = normalizeDetailBullets(data.details);
	if (data.variants !== undefined) edit.variants = normalizeVariants(data.variants);

	if (data.price !== undefined) {
		edit.unitAmountCents = normalizePriceDollars(data.price);
	} else if (edit.variants && edit.variants.length > 0) {
		const variantPrice = edit.variants.reduce<number | undefined>((min, v) => {
			if (v.price === undefined) return min;
			return min === undefined ? v.price : Math.min(min, v.price);
		}, undefined);
		if (variantPrice !== undefined) {
			edit.unitAmountCents = normalizePriceDollars(variantPrice);
		}
	}

	if (data.compare_at_price !== undefined) {
		edit.compareAtCents = normalizeCompareAtCents(data.compare_at_price);
	} else if (edit.variants && edit.variants.length > 0) {
		const variantCompareAt = edit.variants.reduce<number | undefined>((min, v) => {
			if (v.compareAt === undefined) return min;
			return min === undefined ? v.compareAt : Math.min(min, v.compareAt);
		}, undefined);
		if (variantCompareAt !== undefined) {
			edit.compareAtCents = normalizeCompareAtCents(variantCompareAt);
		}
	}

	if (data.currency !== undefined) edit.currency = normalizeCurrency(data.currency);
	if (data.is_active !== undefined) edit.isActive = data.is_active === true;
	if (data.is_featured !== undefined) edit.isFeatured = data.is_featured === true;
	if (data.category !== undefined) edit.category = normalizeCategoryIds(data.category);

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
