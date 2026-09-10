/**
 * CMS pages + navigation admin model (pure domain).
 */

export type NavLocation = 'header' | 'footer' | 'mobile';
export const NAV_LOCATIONS: NavLocation[] = ['header', 'footer', 'mobile'];

function throwCmsIssue(message: string): never {
	throw { status: 400, message };
}

export interface NormalizedPage {
	slug: string;
	title: string;
	content: string;
	meta_description: string;
}

/** Validate the admin page payload (slug must stay URL-safe). */
export function normalizePageInput(input: unknown): NormalizedPage {
	if (!input || typeof input !== 'object') throwCmsIssue('页面数据格式错误');
	const data = input as Record<string, unknown>;
	const slug = String(data.slug ?? '')
		.trim()
		.toLowerCase();
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throwCmsIssue('slug 需为小写字母/数字/连字符');
	}
	const title = String(data.title ?? '').trim();
	if (title.length < 2 || title.length > 120) throwCmsIssue('标题需为 2–120 个字符');
	return {
		slug,
		title,
		content: String(data.content ?? ''),
		meta_description: String(data.meta_description ?? '')
			.trim()
			.slice(0, 300)
	};
}

export interface NormalizedNavItem {
	label: string;
	url: string;
	location: NavLocation;
	parent: string;
	order: number;
	is_visible: boolean;
}

/** Validate the admin navigation payload. */
export function normalizeNavInput(input: unknown): NormalizedNavItem {
	if (!input || typeof input !== 'object') throwCmsIssue('导航数据格式错误');
	const data = input as Record<string, unknown>;
	const label = String(data.label ?? '').trim();
	if (label.length < 1 || label.length > 40) throwCmsIssue('菜单名需为 1–40 个字符');
	const url = String(data.url ?? '').trim();
	if (!/^(\/|https?:\/\/)/.test(url)) throwCmsIssue('链接需以 / 或 http(s):// 开头');
	const location = String(data.location ?? 'header');
	if (!(NAV_LOCATIONS as readonly string[]).includes(location)) {
		throwCmsIssue('位置仅支持 header / footer / mobile');
	}
	const order = Number(data.order ?? 0);
	if (!Number.isInteger(order) || order < 0 || order > 9999) {
		throwCmsIssue('排序必须是不小于 0 的整数');
	}
	return {
		label,
		url,
		location: location as NavLocation,
		parent: String(data.parent ?? '').trim(),
		order,
		is_visible: data.is_visible === undefined ? true : data.is_visible === true
	};
}

export interface PageRow {
	id: string;
	slug: string;
	title: string;
	updated: string;
}

export interface NavRow {
	id: string;
	label: string;
	url: string;
	location: string;
	parent: string;
	order: number;
	isActive: boolean;
}

/** Pure row projections (unit-testable without PocketBase). */
export function toPageRow(record: {
	id: string;
	slug: string;
	title?: string;
	updated: string;
}): PageRow {
	return { id: record.id, slug: record.slug, title: record.title || '', updated: record.updated };
}

export function toNavRow(record: {
	id: string;
	label: string;
	url: string;
	location?: string;
	parent?: string;
	order?: number;
	is_visible?: boolean;
}): NavRow {
	return {
		id: record.id,
		label: record.label,
		url: record.url,
		location: record.location || 'header',
		parent: record.parent || '',
		order: Number(record.order) || 0,
		isActive: record.is_visible !== false
	};
}
