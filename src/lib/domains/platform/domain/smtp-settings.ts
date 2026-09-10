/**
 * SMTP mail settings (pure domain).
 *
 * Models the PocketBase `smtp` + sender identity (`meta`) settings edited
 * from the admin settings page. Passwords never leave the server — clients
 * only learn whether one is set.
 */

export type SmtpAuthMethod = 'LOGIN' | 'PLAIN';

export interface SmtpSettings {
	host: string;
	port: number;
	username: string;
	/** Empty = leave the stored password unchanged. */
	password: string;
	authMethod: SmtpAuthMethod;
	tls: boolean;
	enabled: boolean;
	fromAddress: string;
	fromName: string;
}

export interface MaskedSmtpSettings extends Omit<SmtpSettings, 'password'> {
	hasPassword: boolean;
}

function throwSmtpIssue(message: string): never {
	throw { status: 400, message };
}

/** Validate the admin save payload (all fields optional = partial update). */
export function normalizeSmtpSettings(input: unknown): Partial<SmtpSettings> {
	if (!input || typeof input !== 'object') throwSmtpIssue('邮件配置格式错误');
	const data = input as Record<string, unknown>;
	const normalized: Partial<SmtpSettings> = {};

	if (data.host !== undefined) {
		const host = String(data.host ?? '').trim();
		if (host && !/^[a-zA-Z0-9.-]+$/.test(host)) throwSmtpIssue('SMTP 主机名无效');
		normalized.host = host;
	}
	if (data.port !== undefined) {
		const port = Number(data.port);
		if (!Number.isInteger(port) || port < 1 || port > 65535) {
			throwSmtpIssue('端口必须是 1–65535 的整数');
		}
		normalized.port = port;
	}
	if (data.username !== undefined) normalized.username = String(data.username ?? '').trim();
	if (data.password !== undefined) normalized.password = String(data.password ?? '');
	if (data.authMethod !== undefined) {
		if (data.authMethod !== 'LOGIN' && data.authMethod !== 'PLAIN') {
			throwSmtpIssue('认证方式仅支持 LOGIN / PLAIN');
		}
		normalized.authMethod = data.authMethod;
	}
	if (data.enabled !== undefined) {
		if (typeof data.enabled !== 'boolean') throwSmtpIssue('启用开关必须是布尔值');
		normalized.enabled = data.enabled;
	}
	if (data.fromAddress !== undefined) {
		const from = String(data.fromAddress ?? '').trim();
		if (from && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)) throwSmtpIssue('发件人邮箱无效');
		normalized.fromAddress = from;
	}
	if (data.fromName !== undefined) normalized.fromName = String(data.fromName ?? '').trim();

	if (normalized.enabled && !normalized.host && data.host !== undefined && !String(data.host).trim()) {
		throwSmtpIssue('启用发信需要填写 SMTP 主机');
	}
	return normalized;
}

/** Client-safe projection (password replaced by a flag). */
export function toMaskedSmtp(settings: SmtpSettings): MaskedSmtpSettings {
	return {
		host: settings.host,
		port: settings.port,
		username: settings.username,
		authMethod: settings.authMethod,
		tls: settings.tls,
		enabled: settings.enabled,
		fromAddress: settings.fromAddress,
		fromName: settings.fromName,
		hasPassword: settings.password.length > 0
	};
}

export const SMTP_TEST_TEMPLATES = ['verification', 'password-reset', 'email-change'] as const;
export type SmtpTestTemplate = (typeof SMTP_TEST_TEMPLATES)[number];

/** Validate the test-email request (never throws for missing optional fields). */
export function normalizeSmtpTest(input: unknown): { toEmail: string; template: SmtpTestTemplate } {
	if (!input || typeof input !== 'object') throwSmtpIssue('测试请求格式错误');
	const data = input as Record<string, unknown>;
	const toEmail = String(data.toEmail ?? '').trim();
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail)) throwSmtpIssue('收件邮箱无效');
	const template = data.template ?? 'verification';
	if (!SMTP_TEST_TEMPLATES.includes(template as SmtpTestTemplate)) {
		throwSmtpIssue('仅支持 verification / password-reset / email-change 模板');
	}
	return { toEmail, template: template as SmtpTestTemplate };
}
