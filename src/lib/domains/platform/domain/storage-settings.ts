/**
 * S3 storage + backup schedule settings (pure domain).
 *
 * Access keys are write-only: clients learn presence, never values.
 */

export interface S3Settings {
	enabled: boolean;
	bucket: string;
	region: string;
	endpoint: string;
	hasAccessKey: boolean;
	forcePathStyle: boolean;
}

export interface BackupSchedule {
	cron: string;
	cronMaxKeep: number;
}

function throwInfraIssue(message: string): never {
	throw { status: 400, message };
}

const CRON_PART = '(\\*|[\\d,/*-]+)';
const CRON_REGEX = new RegExp(`^${CRON_PART}(\\s+${CRON_PART}){4}$`);

function isValidCron(value: string): boolean {
	return CRON_REGEX.test(value.trim());
}

export interface NormalizedS3 {
	enabled?: boolean;
	bucket?: string;
	region?: string;
	endpoint?: string;
	accessKey?: string;
	secret?: string;
	forcePathStyle?: boolean;
}

/** Validate the admin S3 save payload (all fields optional). */
export function normalizeS3Settings(input: unknown): NormalizedS3 {
	if (!input || typeof input !== 'object') throwInfraIssue('S3 配置格式错误');
	const data = input as Record<string, unknown>;
	const normalized: NormalizedS3 = {};

	if (data.enabled !== undefined) {
		if (typeof data.enabled !== 'boolean') throwInfraIssue('启用开关必须是布尔值');
		normalized.enabled = data.enabled;
	}
	for (const field of ['bucket', 'region', 'endpoint'] as const) {
		if (data[field] !== undefined) normalized[field] = String(data[field] ?? '').trim();
	}
	if (data.accessKey !== undefined) normalized.accessKey = String(data.accessKey ?? '');
	if (data.secret !== undefined) normalized.secret = String(data.secret ?? '');
	if (data.forcePathStyle !== undefined) {
		if (typeof data.forcePathStyle !== 'boolean') throwInfraIssue('forcePathStyle 必须是布尔值');
		normalized.forcePathStyle = data.forcePathStyle;
	}
	if (normalized.enabled && !normalized.bucket && data.bucket !== undefined && !String(data.bucket).trim()) {
		throwInfraIssue('启用 S3 需要填写 bucket');
	}
	if (normalized.endpoint && !/^https?:\/\/.+/.test(normalized.endpoint)) {
		throwInfraIssue('endpoint 必须是 http(s) 地址');
	}
	return normalized;
}

export interface NormalizedBackups {
	cron?: string;
	cronMaxKeep?: number;
}

/** Validate the backup schedule payload. */
export function normalizeBackupSchedule(input: unknown): NormalizedBackups {
	if (!input || typeof input !== 'object') throwInfraIssue('备份配置格式错误');
	const data = input as Record<string, unknown>;
	const normalized: NormalizedBackups = {};

	if (data.cron !== undefined) {
		const cron = String(data.cron ?? '').trim();
		if (!isValidCron(cron)) throwInfraIssue('cron 必须是 5 段式表达式（如 0 0 * * *）');
		normalized.cron = cron;
	}
	if (data.cronMaxKeep !== undefined) {
		const keep = Number(data.cronMaxKeep);
		if (!Number.isInteger(keep) || keep < 1 || keep > 100) {
			throwInfraIssue('保留份数必须是 1–100 的整数');
		}
		normalized.cronMaxKeep = keep;
	}
	return normalized;
}

export interface MaskedS3 {
	enabled: boolean;
	bucket: string;
	region: string;
	endpoint: string;
	hasAccessKey: boolean;
	hasSecret: boolean;
	forcePathStyle: boolean;
}

/** Client-safe projection (keys replaced by presence flags). */
export function toMaskedS3(settings: {
	enabled: boolean;
	bucket: string;
	region: string;
	endpoint: string;
	accessKey: string;
	secret: string;
	forcePathStyle: boolean;
}): MaskedS3 {
	return {
		enabled: settings.enabled,
		bucket: settings.bucket,
		region: settings.region,
		endpoint: settings.endpoint,
		hasAccessKey: settings.accessKey.length > 0,
		hasSecret: settings.secret.length > 0,
		forcePathStyle: settings.forcePathStyle
	};
}
