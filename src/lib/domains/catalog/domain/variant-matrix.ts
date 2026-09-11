/**
 * Variant matrix pure domain logic.
 *
 * Provides standard size/color presets, cartesian variant matrix generation,
 * standard SKU formatting, and stock adjustments.
 */

export interface ColorPreset {
	name: string;
	slug: string;
	swatch: string;
}

export const DEFAULT_SIZE_PRESETS: readonly string[] = [
	'XS',
	'S',
	'M',
	'L',
	'XL',
	'XXL',
	'ONE SIZE'
] as const;

export const DEFAULT_COLOR_PRESETS: readonly ColorPreset[] = [
	{ name: '曜石黑', slug: 'BLK', swatch: '#18181b' },
	{ name: '珍珠白', slug: 'WHT', swatch: '#ffffff' },
	{ name: '高级灰', slug: 'GRY', swatch: '#71717a' },
	{ name: '米白奶杏', slug: 'CRM', swatch: '#f5f5f0' },
	{ name: '深藏蓝', slug: 'NVY', swatch: '#1e293b' },
	{ name: '大地卡其', slug: 'KHK', swatch: '#a3907c' },
	{ name: '橄榄绿', slug: 'OLV', swatch: '#556b2f' },
	{ name: '勃艮第红', slug: 'BGY', swatch: '#800020' }
] as const;

/**
 * Format a clean SKU segment from any string.
 * Converts characters to uppercase alphanumeric, falling back to a default.
 */
export function sanitizeSkuSegment(value: string, fallback: string): string {
	const sanitized = value
		.trim()
		.toUpperCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return sanitized || fallback;
}

/**
 * Generate a standard SKU given a product slug, color, and size.
 * Format: `{SLUG}-{COLOR}-{SIZE}`.
 */
export function generateSku(
	productSlug: string,
	color: string,
	size: string,
	colorCode?: string
): string {
	const base = sanitizeSkuSegment(productSlug, 'PROD');
	const col = colorCode
		? sanitizeSkuSegment(colorCode, 'CLR')
		: sanitizeSkuSegment(color, 'CLR');
	const sz = sanitizeSkuSegment(size, 'STD');
	return `${base}-${col}-${sz}`;
}

export interface VariantMatrixItem {
	id?: string;
	color: string;
	colorSwatch?: string;
	size: string;
	sku: string;
	stockQuantity: number;
	price?: number;
	compareAt?: number;
}

export interface GenerateVariantsOptions {
	productSlug: string;
	colors: Array<{ name: string; slug?: string; swatch?: string }>;
	sizes: string[];
	defaultStock?: number;
	defaultPrice?: number;
	defaultCompareAt?: number;
}

/**
 * Generate a cartesian product of colors x sizes with auto-formatted SKUs.
 */
export function generateVariantMatrix(options: GenerateVariantsOptions): VariantMatrixItem[] {
	const { productSlug, colors, sizes, defaultStock = 10, defaultPrice, defaultCompareAt } = options;
	const results: VariantMatrixItem[] = [];

	if (colors.length === 0 && sizes.length === 0) {
		return results;
	}

	const normalizedColors =
		colors.length > 0
			? colors
			: [{ name: '标准色', slug: 'STD', swatch: '#71717a' }];

	const normalizedSizes =
		sizes.length > 0
			? sizes
			: ['ONE SIZE'];

	for (const color of normalizedColors) {
		for (const size of normalizedSizes) {
			const sku = generateSku(productSlug, color.name, size, color.slug);
			results.push({
				color: color.name,
				colorSwatch: color.swatch,
				size,
				sku,
				stockQuantity: defaultStock,
				...(defaultPrice !== undefined ? { price: defaultPrice } : {}),
				...(defaultCompareAt !== undefined ? { compareAt: defaultCompareAt } : {})
			});
		}
	}

	return results;
}

/**
 * Adjust stock safely ensuring non-negative integers.
 */
export function adjustStock(currentStock: number, delta: number): number {
	const current = Number.isFinite(currentStock) ? currentStock : 0;
	return Math.max(0, Math.round(current + delta));
}
