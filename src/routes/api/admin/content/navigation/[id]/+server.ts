import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveAdminNavItem, deleteAdminNavItem } from '$domains/content/server';
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
		const item = await saveAdminNavItem(params.id, body);
		return json({ success: true, item });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存导航失败';
		throw error(status, message);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	try {
		await deleteAdminNavItem(params.id);
		return json({ success: true });
	} catch {
		throw error(500, '删除导航失败');
	}
};
