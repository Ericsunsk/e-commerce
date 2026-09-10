import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAdminPages, saveAdminPage } from '$domains/content/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	return json({ success: true, pages: await listAdminPages() });
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
		const page = await saveAdminPage(null, body);
		return json({ success: true, page }, { status: 201 });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存页面失败';
		throw error(status, message);
	}
};
