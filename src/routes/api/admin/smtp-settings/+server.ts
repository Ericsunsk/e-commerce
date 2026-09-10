import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMaskedSmtpSettings, saveSmtpSettings } from '$domains/platform/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	return json({ success: true, settings: await getMaskedSmtpSettings() });
};

export const PUT: RequestHandler = async ({ locals, request }) => {
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
		const settings = await saveSmtpSettings(body);
		return json({ success: true, settings });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存邮件配置失败';
		throw error(status, message);
	}
};
