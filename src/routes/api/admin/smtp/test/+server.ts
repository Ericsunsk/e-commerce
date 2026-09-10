import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendSmtpTestEmail } from '$domains/platform/server';
import { getErrorStatus } from '$shared/infrastructure/server';

/** Send a template test email via the stored SMTP settings. */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}

	let body: unknown = {};
	try {
		body = await request.json();
	} catch {
		// Empty body → validation will complain about the missing address.
	}

	try {
		const result = await sendSmtpTestEmail(body);
		return json({ success: true, ...result });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '发送测试邮件失败';
		throw error(status, message);
	}
};
