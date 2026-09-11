import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setProductActive, setProductFeatured } from '$domains/catalog/server';
import { normalizeActiveToggle, normalizeFeaturedToggle } from '$domains/catalog/domain/product-visibility';

/** Lightweight admin PATCH: flip `is_active` and/or `is_featured` without a full page reload. */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, '请求格式错误');
	}

	const hasActive = body && typeof body === 'object' && 'is_active' in body;
	const hasFeatured = body && typeof body === 'object' && 'is_featured' in body;

	if (!hasActive && !hasFeatured) {
		throw error(400, '必须提供 is_active 或 is_featured');
	}

	let activeResult: { id: string; is_active: boolean } | undefined;
	let featuredResult: { id: string; is_featured: boolean } | undefined;

	if (hasActive) {
		const isActive = normalizeActiveToggle(body);
		activeResult = await setProductActive(params.id, isActive);
	}

	if (hasFeatured) {
		const isFeatured = normalizeFeaturedToggle(body);
		featuredResult = await setProductFeatured(params.id, isFeatured);
	}

	return json({
		success: true,
		id: params.id,
		...(activeResult ? { is_active: activeResult.is_active } : {}),
		...(featuredResult ? { is_featured: featuredResult.is_featured } : {})
	});
};
