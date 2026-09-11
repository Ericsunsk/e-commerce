/**
 * Product storefront visibility (pure domain).
 *
 * A product is concealed from the storefront only when `is_active` is
 * explicitly `false`. Missing/legacy values stay visible so records created
 * before the `is_active` rollout (PB default `true` applies to new rows
 * only) never vanish.
 */

export interface VisibilityRecord {
	is_active?: unknown;
}

/** Visible unless explicitly deactivated. */
export function isStorefrontVisible(record: VisibilityRecord | null | undefined): boolean {
	if (!record) return false;
	return record.is_active !== false;
}

export function filterVisibleProducts<T extends VisibilityRecord>(records: T[]): T[] {
	return records.filter(isStorefrontVisible);
}

/** Validate the admin toggle payload; throws `{ status: 400 }` otherwise. */
export function normalizeActiveToggle(input: unknown): boolean {
	if (!input || typeof input !== 'object') {
		throw { status: 400, message: '请求数据格式错误' };
	}
	const value = (input as Record<string, unknown>).is_active;
	if (typeof value !== 'boolean') {
		throw { status: 400, message: 'is_active 必须是布尔值' };
	}
	return value;
}

/** Validate the admin featured toggle payload; throws `{ status: 400 }` otherwise. */
export function normalizeFeaturedToggle(input: unknown): boolean {
	if (!input || typeof input !== 'object') {
		throw { status: 400, message: '请求数据格式错误' };
	}
	const value = (input as Record<string, unknown>).is_featured;
	if (typeof value !== 'boolean') {
		throw { status: 400, message: 'is_featured 必须是布尔值' };
	}
	return value;
}

