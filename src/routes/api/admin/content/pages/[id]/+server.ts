import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminPageById, saveAdminPage, deleteAdminPage } from '$domains/content/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	const page = await getAdminPageById(params.id);
	if (!page) {
		throw error(404, '页面不存在');
	}
	return json({ success: true, page });
};

async function readBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		throw error(400, '请求格式错误');
	}
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	try {
		const page = await saveAdminPage(params.id, await readBody(request));
		return json({ success: true, page });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存页面失败';
		throw error(status, message);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	try {
		await deleteAdminPage(params.id);
		return json({ success: true });
	} catch {
		throw error(500, '删除页面失败');
	}
};
