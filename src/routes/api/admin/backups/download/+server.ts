import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadBackup } from '$domains/platform/server';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	return downloadBackup(url.searchParams.get('key') || '');
};
