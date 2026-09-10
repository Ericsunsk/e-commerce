import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateCatalogProduct } from '$domains/catalog/server';
import { getErrorStatus } from '$shared/infrastructure/server';

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

	try {
		const product = await updateCatalogProduct(params.id, body);
		return json({ success: true, product });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存商品失败';
		throw error(status, message);
	}
};
