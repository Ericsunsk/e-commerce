import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { testS3Connection } from '$domains/platform/server';

/** Test S3 connectivity for `?filesystem=storage|backups` (default storage). */
export const POST: RequestHandler = async ({ locals, url }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	const result = await testS3Connection(url.searchParams.get('filesystem') || 'storage');
	return json({ success: true, ...result });
};
