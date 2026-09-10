/**
 * Payment settings (pure domain).
 *
 * Models the Stripe gateway configuration stored in the private
 * `payment_settings` PocketBase table, with per-field fallback to `.env`
 * when the database holds no value. Secrets never leave the server —
 * clients only receive masked previews.
 */

import { maskIdentifier } from '$shared/kernel';

export interface PaymentSettingsRecord {
	publishableKey: string;
	secretKey: string;
	webhookSecret: string;
	enabled: boolean;
}

export interface EffectivePaymentConfig extends PaymentSettingsRecord {
	/** Whether any database row backs this config (`env` = pure fallback). */
	source: 'database' | 'env';
}

export interface EnvPaymentConfig {
	publishableKey?: string;
	secretKey?: string;
	webhookSecret?: string;
}

/** Mask a secret for display (`sk_test_51...x9q2`); empty stays empty. */
export function maskSecret(secret: string | null | undefined): string {
	return maskIdentifier(secret);
}

function throwPaymentIssue(message: string): never {
	throw { status: 400, message };
}

function readKey(value: unknown, field: string, prefix: string): string | undefined {
	if (value === undefined || value === null) return undefined;
	const text = String(value).trim();
	if (!text) return '';
	if (!text.startsWith(prefix)) {
		throwPaymentIssue(`${field} 必须以 ${prefix} 开头`);
	}
	return text;
}

export interface NormalizedPaymentSettings {
	publishableKey?: string;
	secretKey?: string;
	webhookSecret?: string;
	enabled?: boolean;
}

/**
 * Validate the admin save payload. Every field is optional (partial
 * update); an empty string clears the stored value back to env fallback.
 */
export function normalizePaymentSettings(input: unknown): NormalizedPaymentSettings {
	if (!input || typeof input !== 'object') throwPaymentIssue('支付配置格式错误');
	const data = input as Record<string, unknown>;
	const normalized: NormalizedPaymentSettings = {};

	if (data.publishableKey !== undefined) {
		normalized.publishableKey = readKey(data.publishableKey, '公钥', 'pk_');
	}
	if (data.secretKey !== undefined) {
		normalized.secretKey = readKey(data.secretKey, '私钥', 'sk_');
	}
	if (data.webhookSecret !== undefined) {
		normalized.webhookSecret = readKey(data.webhookSecret, 'Webhook 密钥', 'whsec_');
	}
	if (data.enabled !== undefined) {
		if (typeof data.enabled !== 'boolean') throwPaymentIssue('启用开关必须是布尔值');
		normalized.enabled = data.enabled;
	}
	return normalized;
}

/**
 * Merge a database row over env fallback, per field. Empty stored values
 * fall back to env so clearing a field restores the old behavior.
 */
export function resolveEffectiveConfig(
	db: PaymentSettingsRecord | null,
	env: EnvPaymentConfig
): EffectivePaymentConfig {
	if (!db) {
		return {
			publishableKey: env.publishableKey?.trim() || '',
			secretKey: env.secretKey?.trim() || '',
			webhookSecret: env.webhookSecret?.trim() || '',
			enabled: true,
			source: 'env'
		};
	}
	return {
		publishableKey: db.publishableKey || env.publishableKey?.trim() || '',
		secretKey: db.secretKey || env.secretKey?.trim() || '',
		webhookSecret: db.webhookSecret || env.webhookSecret?.trim() || '',
		enabled: db.enabled,
		source: 'database'
	};
}

export interface MaskedPaymentSettings {
	publishableKey: string;
	secretMasked: string;
	webhookMasked: string;
	hasSecret: boolean;
	hasWebhookSecret: boolean;
	enabled: boolean;
	source: 'database' | 'env';
}

/**
 * Whether the effective secret is a live key (`sk_live_...`).
 * Test keys (`sk_test_...`) and placeholders are treated as non-live so
 * single-price lookups fall back to test pricing consistently.
 */
export function isTestMode(config: EffectivePaymentConfig): boolean {
	return (
		!config.secretKey ||
		config.secretKey.startsWith('sk_test') ||
		config.secretKey.includes('placeholder')
	);
}

/** Client-safe projection (masked secrets only). */
export function toMaskedSettings(config: EffectivePaymentConfig): MaskedPaymentSettings {
	return {
		publishableKey: config.publishableKey,
		secretMasked: maskSecret(config.secretKey),
		webhookMasked: maskSecret(config.webhookSecret),
		hasSecret: config.secretKey.length > 0,
		hasWebhookSecret: config.webhookSecret.length > 0,
		enabled: config.enabled,
		source: config.source
	};
}

export interface ConfigCacheDeps<T> {
	load: () => Promise<T>;
	now?: () => number;
	ttlMs?: number;
}

/** Tiny TTL cache with explicit invalidation and single-flight refresh. */
export function createConfigCache<T>(deps: ConfigCacheDeps<T>) {
	const now = deps.now ?? Date.now;
	const ttlMs = deps.ttlMs ?? 60_000;
	let cached: { value: T; at: number } | null = null;
	let inflight: Promise<T> | null = null;

	async function get(): Promise<T> {
		if (cached && now() - cached.at < ttlMs) return cached.value;
		if (!inflight) {
			inflight = deps.load().then((value) => {
				cached = { value, at: now() };
				return value;
			});
		}
		try {
			return await inflight;
		} finally {
			inflight = null;
		}
	}

	function invalidate(): void {
		cached = null;
	}

	return { get, invalidate };
}
