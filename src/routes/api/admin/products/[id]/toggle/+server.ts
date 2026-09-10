import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setProductActive } from '$domains/catalog/server';
import { normalizeActiveToggle } from '$domains/catalog/domain/product-visibility';

/** Lightweight admin PATCH: flip `is_active` without a full page reload. */
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

	let isActive: boolean;
	try {
		isActive = normalizeActiveToggle(body);
	} catch {
		throw error(400, 'is_active 必须是布尔值');
	}

	const result = await setProductActive(params.id, isActive);
	return json({ success: true, ...result });
};
