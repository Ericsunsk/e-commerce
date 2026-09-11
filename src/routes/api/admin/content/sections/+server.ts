import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAdminSections, saveAdminSection } from '$domains/content/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	const pageId = url.searchParams.get('pageId') || undefined;
	return json({ success: true, sections: await listAdminSections(pageId) });
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
		const section = await saveAdminSection(null, body);
		return json({ success: true, section }, { status: 201 });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存区块失败';
		throw error(status, message);
	}
};
