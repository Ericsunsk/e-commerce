import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createBackup, listBackupRows } from '$domains/platform/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	return json({ success: true, backups: await listBackupRows() });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}

	let basename = 'manual';
	try {
		const body = await request.json();
		if (typeof body?.basename === 'string' && body.basename.trim()) {
			basename = body.basename;
		}
	} catch {
		// Empty body → default basename.
	}

	try {
		await createBackup(basename);
		return json({ success: true });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		throw error(status, '创建备份失败');
	}
};
