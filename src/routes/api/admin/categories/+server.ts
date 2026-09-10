import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAdminCategories, saveAdminCategory } from '$domains/catalog/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	return json({ success: true, categories: await listAdminCategories() });
};

export const POST: RequestHandler = async ({ locals, request }) => {
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
		const category = await saveAdminCategory(null, body);
		return json({ success: true, category }, { status: 201 });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存分类失败';
		throw error(status, message);
	}
};
