import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEmailTemplates, saveEmailTemplate } from '$domains/platform/server';
import type { EmailTemplateKey } from '$domains/platform/server';
import { getErrorStatus } from '$shared/infrastructure/server';

const KEYS = ['verification', 'password-reset', 'email-change'] as const;

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}
	return json({ success: true, templates: await getEmailTemplates() });
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		throw error(400, '请求格式错误');
	}

	const key = body.key as EmailTemplateKey;
	if (!(KEYS as readonly string[]).includes(key)) {
		throw error(400, '仅支持 verification / password-reset / email-change');
	}

	try {
		const template = await saveEmailTemplate(key, body.template);
		return json({ success: true, template });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '保存模板失败';
		throw error(status, message);
	}
};
