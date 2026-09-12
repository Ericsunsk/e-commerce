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
	const col = colorCode ? sanitizeSkuSegment(colorCode, 'CLR') : sanitizeSkuSegment(color, 'CLR');
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
		colors.length > 0 ? colors : [{ name: '标准色', slug: 'STD', swatch: '#71717a' }];

	const normalizedSizes = sizes.length > 0 ? sizes : ['ONE SIZE'];

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

// ---------------------------------------------------------------------------
// Color grouping (extracted from _VariantMatrix.svelte)
//
// The matrix editor groups flat variant rows by colour for display, and needs a
// stable key that survives a blank colour. Both the grouping and the gallery
// union were inline `$derived`/`$effect` blocks in the component; they are pure
// transformations of rows, so they live here where they can be tested without
// mounting a 1200-line component.
// ---------------------------------------------------------------------------

/** A variant row as the matrix editor holds it (id-less until saved). */
export interface MatrixRow {
	id?: string;
	color: string;
	size: string;
	sku: string;
	stockQuantity: number;
	colorSwatch?: string;
	/** Retained gallery filenames (server-stored). */
	gallery?: string[];
}

/** The colour an untitled group falls back to. */
export const UNNAMED_COLOR_LABEL = '(未命名颜色)';

/**
 * Group key for a row's colour.
 *
 * Case- and whitespace-insensitive so "Red", "red ", and "RED" are one group —
 * otherwise a stray space silently splits a colour into two swatches.
 */
export function colorKeyOf(row: { color?: string }): string {
	return (row.color ?? '').trim().toLowerCase() || UNNAMED_COLOR_LABEL;
}

/** A colour's display label: the first non-empty colour seen, trimmed. */
export function colorLabelOf(row: { color?: string }): string {
	return (row.color ?? '').trim() || UNNAMED_COLOR_LABEL;
}

export interface ColorGroupEntry<T> {
	row: T;
	/** Index in the original flat array — needed to write edits back. */
	index: number;
}

export interface ColorGroup<T> {
	key: string;
	color: string;
	colorSwatch?: string;
	entries: Array<ColorGroupEntry<T>>;
	/** Union of every gallery filename across the group's rows. */
	gallery: string[];
	stockTotal: number;
}

/**
 * Group flat rows by colour, preserving first-seen order.
 *
 * The swatch is taken from the first row that has one; the gallery is the union
 * across the group (a per-colour gallery shared by all its sizes); the stock is
 * the sum. Rows with a blank colour collect into a single unnamed group.
 */
export function groupRowsByColor<T extends MatrixRow>(rows: T[]): ColorGroup<T>[] {
	const map = new Map<string, ColorGroup<T>>();

	rows.forEach((row, index) => {
		const key = colorKeyOf(row);
		let group = map.get(key);
		if (!group) {
			group = {
				key,
				color: colorLabelOf(row),
				colorSwatch: row.colorSwatch,
				entries: [],
				gallery: [],
				stockTotal: 0
			};
			map.set(key, group);
		}

		group.entries.push({ row, index });
		if (!group.colorSwatch && row.colorSwatch) group.colorSwatch = row.colorSwatch;
		for (const name of row.gallery ?? []) {
			if (!group.gallery.includes(name)) group.gallery.push(name);
		}
		group.stockTotal += Number(row.stockQuantity) || 0;
	});

	return [...map.values()];
}

/** The union of gallery filenames for each colour, keyed by `colorKeyOf`. */
export function collectGalleryUnionByColor(
	rows: Array<{ color?: string; gallery?: string[] }>
): Map<string, string[]> {
	const union = new Map<string, string[]>();
	for (const row of rows) {
		const key = colorKeyOf(row);
		const list = union.get(key) ?? [];
		for (const name of row.gallery ?? []) {
			if (!list.includes(name)) list.push(name);
		}
		union.set(key, list);
	}
	return union;
}

function sameStringSet(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	const sortedA = [...a].sort();
	const sortedB = [...b].sort();
	return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * Whether any row's gallery diverges from its colour's union.
 *
 * The editor converges this once on mount so a save round-trips identically:
 * every row of a colour carries the full union, rather than whichever subset it
 * happened to arrive with. Detecting divergence is separated from applying it so
 * the caller can decide whether to write.
 */
export function needsGalleryNormalization<T extends { color?: string; gallery?: string[] }>(
	rows: T[]
): boolean {
	const union = collectGalleryUnionByColor(rows);
	return rows.some((row) => {
		const expected = union.get(colorKeyOf(row)) ?? [];
		return !sameStringSet(row.gallery ?? [], expected);
	});
}

/** Return rows with every gallery replaced by its colour's union. */
export function normalizeGalleriesByColor<T extends { color?: string; gallery?: string[] }>(
	rows: T[]
): T[] {
	const union = collectGalleryUnionByColor(rows);
	return rows.map((row) => ({
		...row,
		gallery: [...(union.get(colorKeyOf(row)) ?? [])].sort()
	}));
}
