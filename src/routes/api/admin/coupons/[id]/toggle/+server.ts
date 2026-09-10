import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setCouponActive } from '$domains/checkout/server';

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

	const isActive = (body as Record<string, unknown> | null)?.is_active;
	if (typeof isActive !== 'boolean') {
		throw error(400, 'is_active 必须是布尔值');
	}

	const result = await setCouponActive(params.id, isActive);
	return json({ success: true, ...result });
};
