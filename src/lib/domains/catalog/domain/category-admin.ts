/**
 * Category admin model (pure domain).
 */

function throwCategoryIssue(message: string): never {
	throw { status: 400, message };
}

export interface NormalizedCategory {
	name: string;
	slug: string;
	description: string;
	sort_order: number;
	is_visible: boolean;
}

/** Validate the admin category payload. */
export function normalizeCategory(input: unknown): NormalizedCategory {
	if (!input || typeof input !== 'object') throwCategoryIssue('分类数据格式错误');
	const data = input as Record<string, unknown>;
	const name = String(data.name ?? '').trim();
	if (name.length < 2 || name.length > 60) throwCategoryIssue('分类名需为 2–60 个字符');

	const slugRaw = String(data.slug ?? '')
		.trim()
		.toLowerCase();
	const slug = slugRaw || slugify(name);
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throwCategoryIssue('slug 需为小写字母/数字/连字符');

	const order = Number(data.sort_order ?? data.order ?? 0);
	if (!Number.isInteger(order) || order < 0 || order > 9999) {
		throwCategoryIssue('排序必须是不小于 0 的整数');
	}
	return {
		name,
		slug,
		description: String(data.description ?? '')
			.trim()
			.slice(0, 500),
		sort_order: order,
		is_visible: data.is_visible === undefined ? true : data.is_visible === true
	};
}

/** Derive a URL slug from a category name (supports CJK via fallback). */
export function slugify(name: string): string {
	const ascii = name
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');
	return ascii || 'category';
}

export interface CategoryRow {
	id: string;
	name: string;
	slug: string;
	sortOrder: number;
	isActive: boolean;
	productCount: number;
}

/** Pure row projection with usage count. */
export function toCategoryRow(
	record: {
		id: string;
		name: string;
		slug: string;
		sort_order?: number;
		is_visible?: boolean;
	},
	productCount: number
): CategoryRow {
	return {
		id: record.id,
		name: record.name,
		slug: record.slug,
		sortOrder: Number(record.sort_order) || 0,
		isActive: record.is_visible !== false,
		productCount
	};
}
