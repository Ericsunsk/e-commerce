import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAdminSectionById,
	saveAdminSection,
	patchAdminSection,
	deleteAdminSection
} from '$domains/content/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	const section = await getAdminSectionById(params.id);
	if (!section) {
		throw error(404, '区块不存在');
	}
	return json({ success: true, section });
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
	const body = (await readBody(request)) as Record<string, unknown>;

	try {
		// If only partial fields like is_active or sort_order are sent
		if (
			!('type' in body) &&
			!('heading' in body) &&
			('is_active' in body || 'sort_order' in body)
		) {
			const section = await patchAdminSection(params.id, {
				is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
				sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined
			});
			return json({ success: true, section });
		}

		const section = await saveAdminSection(params.id, body);
		return json({ success: true, section });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存区块失败';
		throw error(status, message);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	try {
		await deleteAdminSection(params.id);
		return json({ success: true });
	} catch {
		throw error(500, '删除区块失败');
	}
};
