/**
 * Platform settings persistence (server-only).
 *
 * Reads/writes PocketBase app settings (`smtp`, `meta`, …) through
 * pb-injected seams so unit tests run against fakes. Today: SMTP mail.
 * S3 + backup cron land here for #41.
 */
import type { TypedPocketBase } from '$shared/infrastructure';
import { withAdmin } from '$shared/infrastructure/server/admin.server';
import {
	normalizeSmtpSettings,
	normalizeSmtpTest,
	toMaskedSmtp,
	type MaskedSmtpSettings,
	type SmtpSettings
} from '../domain/smtp-settings';
import {
	normalizeS3Settings,
	normalizeBackupSchedule,
	toMaskedS3,
	type BackupSchedule,
	type MaskedS3
} from '../domain/storage-settings';
import { toAuthMethodsView, type AuthMethodsView } from '../domain/auth-methods';
import {
	normalizeEmailTemplate,
	toTemplateContent,
	type EmailTemplateContent,
	type EmailTemplateKey
} from '../domain/email-templates';
import { toBackupRows, type BackupRow } from '../domain/backups';
import {
	normalizeLogsQuery,
	buildLogsFilter,
	toLogRow,
	type LogRow,
	type LogsQuery
} from '../domain/server-logs';

interface PbSmtp {
	enabled?: boolean;
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	authMethod?: string;
	tls?: boolean;
	localName?: string;
}

function toSmtpSettings(all: {
	smtp?: PbSmtp;
	meta?: { senderAddress?: string; senderName?: string };
}): SmtpSettings {
	const smtp = all.smtp ?? {};
	return {
		host: smtp.host || '',
		port: Number(smtp.port) || 587,
		username: smtp.username || '',
		password: smtp.password || '',
		authMethod: smtp.authMethod === 'PLAIN' ? 'PLAIN' : 'LOGIN',
		tls: smtp.tls !== false,
		enabled: smtp.enabled === true,
		fromAddress: all.meta?.senderAddress || '',
		fromName: all.meta?.senderName || ''
	};
}

/** Read SMTP + sender identity (testable seam). */
export async function getSmtpSettingsWithClient(pb: TypedPocketBase): Promise<SmtpSettings> {
	const all = (await pb.settings.getAll()) as {
		smtp?: PbSmtp;
		meta?: { senderAddress?: string; senderName?: string };
	};
	return toSmtpSettings(all);
}

/** Persist a partial SMTP update (empty password = keep stored one). */
export async function saveSmtpSettingsWithClient(
	pb: TypedPocketBase,
	input: unknown
): Promise<SmtpSettings> {
	const data = normalizeSmtpSettings(input);
	const all = (await pb.settings.getAll()) as { smtp?: PbSmtp };
	const prev: PbSmtp = all.smtp ?? {};

	const next: Record<string, unknown> = {
		enabled: data.enabled ?? prev.enabled ?? false,
		host: data.host ?? prev.host ?? '',
		port: data.port ?? prev.port ?? 587,
		username: data.username ?? prev.username ?? '',
		authMethod: data.authMethod ?? prev.authMethod ?? 'LOGIN',
		tls: data.tls ?? prev.tls ?? true,
		localName: ''
	};
	// Only overwrite the stored password when a new one is supplied.
	if (data.password) next.password = data.password;
	else if (prev.password) next.password = prev.password;

	const meta: Record<string, unknown> = {};
	if (data.fromAddress !== undefined) meta.senderAddress = data.fromAddress;
	if (data.fromName !== undefined) meta.senderName = data.fromName;

	await pb.settings.update({
		smtp: next,
		...(Object.keys(meta).length > 0 ? { meta } : {})
	});
	return getSmtpSettingsWithClient(pb);
}

/** Send a template test email (users collection). */
export async function sendSmtpTestEmailWithClient(
	pb: TypedPocketBase,
	input: unknown
): Promise<{ ok: boolean; message: string }> {
	const { toEmail, template } = normalizeSmtpTest(input);
	try {
		await pb.settings.testEmail('users', toEmail, template);
		return { ok: true, message: `测试邮件已发送至 ${toEmail}` };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, message: `发送失败：${message}` };
	}
}

export async function getMaskedSmtpSettings(): Promise<MaskedSmtpSettings> {
	return withAdmin(async (pb) => toMaskedSmtp(await getSmtpSettingsWithClient(pb)));
}

export async function saveSmtpSettings(input: unknown): Promise<MaskedSmtpSettings> {
	return withAdmin(async (pb) => toMaskedSmtp(await saveSmtpSettingsWithClient(pb, input)));
}

export async function sendSmtpTestEmail(input: unknown): Promise<{ ok: boolean; message: string }> {
	return withAdmin((pb) => sendSmtpTestEmailWithClient(pb, input));
}

/** Read-only auth methods status for the `users` collection. */
export async function getAuthMethodsView(): Promise<AuthMethodsView> {
	return withAdmin(async (pb) => {
		const collection = (await pb.collections.getOne('users')) as {
			passwordAuth?: { enabled?: boolean };
			mfa?: { enabled?: boolean };
			otp?: { enabled?: boolean };
			oauth2?: {
				enabled?: boolean;
				providers?: Array<{ name?: string; displayName?: string; clientId?: string }>;
			};
		};
		return toAuthMethodsView(collection);
	});
}

const TEMPLATE_FIELDS = {
	verification: 'verificationTemplate',
	'password-reset': 'resetPasswordTemplate',
	'email-change': 'confirmEmailChangeTemplate'
} as const;

/** Read the three transactional email templates. */
export async function getEmailTemplates(): Promise<Record<EmailTemplateKey, EmailTemplateContent>> {
	return withAdmin(async (pb) => {
		const collection = (await pb.collections.getOne('users')) as Record<string, unknown>;
		return {
			verification: toTemplateContent(
				collection[TEMPLATE_FIELDS.verification] as EmailTemplateContent | undefined
			),
			'password-reset': toTemplateContent(
				collection[TEMPLATE_FIELDS['password-reset']] as EmailTemplateContent | undefined
			),
			'email-change': toTemplateContent(
				collection[TEMPLATE_FIELDS['email-change']] as EmailTemplateContent | undefined
			)
		};
	});
}

/** Persist one transactional email template. */
export async function saveEmailTemplate(
	key: EmailTemplateKey,
	input: unknown
): Promise<EmailTemplateContent> {
	if (!(key in TEMPLATE_FIELDS)) {
		throw { status: 400, message: '仅支持 verification / password-reset / email-change' };
	}
	const content = normalizeEmailTemplate(input);
	await withAdmin((pb) => pb.collections.update('users', { [TEMPLATE_FIELDS[key]]: content }));
	return content;
}

/** List backup archives, newest first. */
export async function listBackupRows(): Promise<BackupRow[]> {
	return withAdmin(async (pb) => {
		const files = await pb.backups.getFullList();
		return toBackupRows(files);
	});
}

/** Trigger a manual backup (`basename` without extension). */
export async function createBackup(basename: string): Promise<void> {
	const name =
		basename
			.trim()
			.replace(/[^\w-]+/g, '-')
			.slice(0, 60) || 'manual';
	await withAdmin((pb) => pb.backups.create(name));
}

/** Stream a backup file through the server so no file token leaks. */
export async function downloadBackup(key: string): Promise<Response> {
	if (!key || key.includes('..')) {
		throw { status: 400, message: '备份 key 无效' };
	}
	return withAdmin(async (pb) => {
		const token = await pb.files.getToken();
		const url = pb.backups.getDownloadURL(token, key);
		const upstream = await fetch(url);
		if (!upstream.ok || !upstream.body) {
			throw { status: 502, message: '备份下载失败' };
		}
		return new Response(upstream.body, {
			headers: {
				'content-type': upstream.headers.get('content-type') ?? 'application/zip',
				'content-disposition': `attachment; filename="${encodeURIComponent(key)}"`
			}
		});
	});
}

export interface LogsPage {
	rows: LogRow[];
	page: number;
	perPage: number;
	totalPages: number;
	totalItems: number;
}

/** Paginated request logs for the admin viewer. */
export async function listServerLogs(input: {
	level?: string;
	query?: string;
	page?: string | number;
}): Promise<LogsPage & { query: LogsQuery }> {
	const query = normalizeLogsQuery(input);
	const perPage = 20;
	return withAdmin(async (pb) => {
		const filter = buildLogsFilter(query);
		const result = await pb.logs.getList(query.page, perPage, {
			sort: '-created',
			...(filter ? { filter } : {})
		});
		return {
			rows: result.items.map((item) =>
				toLogRow({
					id: item.id,
					created: item.created,
					level: (item as { level?: string }).level,
					message: (item as { message?: string }).message,
					data: (item as { data?: Record<string, unknown> }).data
				})
			),
			page: result.page,
			perPage: result.perPage,
			totalPages: result.totalPages,
			totalItems: result.totalItems,
			query
		};
	});
}

interface PbS3 {
	enabled?: boolean;
	bucket?: string;
	region?: string;
	endpoint?: string;
	accessKey?: string;
	secret?: string;
	forcePathStyle?: boolean;
}

function toMaskedS3FromRaw(s3: PbS3): MaskedS3 {
	return toMaskedS3({
		enabled: s3.enabled === true,
		bucket: s3.bucket || '',
		region: s3.region || '',
		endpoint: s3.endpoint || '',
		accessKey: s3.accessKey || '',
		secret: s3.secret || '',
		forcePathStyle: s3.forcePathStyle !== false
	});
}

/** Read storage S3 config (keys masked). */
export async function getMaskedS3(): Promise<MaskedS3> {
	return withAdmin(async (pb) => {
		const all = (await pb.settings.getAll()) as { s3?: PbS3 };
		return toMaskedS3FromRaw(all.s3 ?? {});
	});
}

/** Read raw S3 config for merging (testable seam). */
export async function getS3WithClient(pb: TypedPocketBase): Promise<PbS3> {
	const all = (await pb.settings.getAll()) as { s3?: PbS3 };
	return all.s3 ?? {};
}

/** Persist a partial S3 update (testable seam). */
export async function saveS3WithClient(pb: TypedPocketBase, input: unknown): Promise<PbS3> {
	const data = normalizeS3Settings(input);
	const prev = await getS3WithClient(pb);
	const next: Record<string, unknown> = {
		enabled: data.enabled ?? prev.enabled ?? false,
		bucket: data.bucket ?? prev.bucket ?? '',
		region: data.region ?? prev.region ?? '',
		endpoint: data.endpoint ?? prev.endpoint ?? '',
		forcePathStyle: data.forcePathStyle ?? prev.forcePathStyle ?? true
	};
	if (data.accessKey) next.accessKey = data.accessKey;
	else if (prev.accessKey) next.accessKey = prev.accessKey;
	if (data.secret) next.secret = data.secret;
	else if (prev.secret) next.secret = prev.secret;

	await pb.settings.update({ s3: next });
	return getS3WithClient(pb);
}

/** Persist a partial S3 update (keys masked in response). */
export async function saveS3Settings(input: unknown): Promise<MaskedS3> {
	return withAdmin(async (pb) => {
		await saveS3WithClient(pb, input);
		const refreshed = await getS3WithClient(pb);
		return toMaskedS3FromRaw(refreshed);
	});
}

/** Test S3 connectivity (testable seam). */
export async function testS3WithClient(
	pb: TypedPocketBase,
	filesystem: string
): Promise<{ ok: boolean; message: string }> {
	if (filesystem !== 'storage' && filesystem !== 'backups') {
		throw { status: 400, message: 'filesystem 仅支持 storage / backups' };
	}
	try {
		const ok = await pb.settings.testS3(filesystem);
		return ok
			? { ok: true, message: `${filesystem} 连通性正常` }
			: { ok: false, message: `${filesystem} 连通性测试未通过` };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, message: `连通性测试失败：${message}` };
	}
}

/** Test S3 connectivity for a filesystem (`storage` or `backups`). */
export async function testS3Connection(
	filesystem: string
): Promise<{ ok: boolean; message: string }> {
	return withAdmin((pb) => testS3WithClient(pb, filesystem));
}

/** Read the backup schedule (testable seam). */
export async function getBackupsWithClient(
	pb: TypedPocketBase
): Promise<{ cron: string; cronMaxKeep: number }> {
	const all = (await pb.settings.getAll()) as {
		backups?: { cron?: string; cronMaxKeep?: number };
	};
	return {
		cron: all.backups?.cron || '0 0 * * *',
		cronMaxKeep: Number(all.backups?.cronMaxKeep) || 3
	};
}

/** Read the backup schedule (cron + retention). */
export async function getBackupSchedule(): Promise<BackupSchedule> {
	return withAdmin((pb) => getBackupsWithClient(pb));
}

/** Persist the backup schedule (testable seam). */
export async function saveBackupsWithClient(
	pb: TypedPocketBase,
	input: unknown
): Promise<{ cron: string; cronMaxKeep: number }> {
	const data = normalizeBackupSchedule(input);
	const prev = await getBackupsWithClient(pb);
	const next = {
		cron: data.cron ?? prev.cron,
		cronMaxKeep: data.cronMaxKeep ?? prev.cronMaxKeep
	};
	await pb.settings.update({ backups: next });
	return next;
}

/** Persist the backup schedule. */
export async function saveBackupSchedule(input: unknown): Promise<BackupSchedule> {
	return withAdmin((pb) => saveBackupsWithClient(pb, input));
}
