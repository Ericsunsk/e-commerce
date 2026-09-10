/**
 * Auth email templates model (pure domain).
 *
 * The three transactional templates live on the `users` collection config
 * (`verificationTemplate`, `resetPasswordTemplate`,
 * `confirmEmailChangeTemplate`). Supported variables are documented inline
 * in the admin UI.
 */

export type EmailTemplateKey = 'verification' | 'password-reset' | 'email-change';

export interface EmailTemplateDef {
	key: EmailTemplateKey;
	label: string;
	variables: string;
}

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
	{ key: 'verification', label: '邮箱验证', variables: '{APP_NAME} {APP_URL} {VERIFICATION_URL}' },
	{ key: 'password-reset', label: '密码重置', variables: '{APP_NAME} {APP_URL} {ACTION_URL}' },
	{ key: 'email-change', label: '换邮确认', variables: '{APP_NAME} {APP_URL} {ACTION_URL}' }
];

export interface EmailTemplateContent {
	subject: string;
	body: string;
	actionUrl: string;
}

function throwTemplateIssue(message: string): never {
	throw { status: 400, message };
}

/** Validate one template body (subject/body lengths, no executable tags). */
export function normalizeEmailTemplate(input: unknown): EmailTemplateContent {
	if (!input || typeof input !== 'object') throwTemplateIssue('模板数据格式错误');
	const data = input as Record<string, unknown>;
	const subject = String(data.subject ?? '').trim();
	const body = String(data.body ?? '');
	const actionUrl = String(data.actionUrl ?? '').trim();

	if (subject.length < 2 || subject.length > 200) throwTemplateIssue('主题需为 2–200 个字符');
	if (body.length < 10 || body.length > 20000) throwTemplateIssue('正文需为 10–20000 个字符');
	if (/<script[\s>]/i.test(body)) throwTemplateIssue('正文不允许包含 script 标签');
	return { subject, body, actionUrl: actionUrl.slice(0, 500) };
}

/** Pure projection of collection template config (missing → empty draft). */
export function toTemplateContent(
	raw: { subject?: string; body?: string; actionUrl?: string } | undefined
): EmailTemplateContent {
	return {
		subject: raw?.subject || '',
		body: raw?.body || '',
		actionUrl: raw?.actionUrl || ''
	};
}
