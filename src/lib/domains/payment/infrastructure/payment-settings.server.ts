/**
 * Payment settings persistence (server-only).
 *
 * Maintains the private `payment_settings` PocketBase collection (all API
 * rules null → superuser-only) and serves the effective config through an
 * in-memory cache with hot invalidation on admin saves.
 */
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { Collections, type TypedPocketBase } from '$shared/infrastructure';
import { withAdmin } from '$shared/infrastructure/server/admin.server';
import { getErrorStatus } from '$shared/infrastructure/server/pocketbase-json.server';
import {
	createConfigCache,
	normalizePaymentSettings,
	resolveEffectiveConfig,
	toMaskedSettings,
	type EffectivePaymentConfig,
	type MaskedPaymentSettings,
	type NormalizedPaymentSettings,
	type PaymentSettingsRecord
} from '../domain/payment-settings';

interface PaymentSettingsRow {
	id: string;
	stripe_publishable_key?: string;
	stripe_secret_key?: string;
	stripe_webhook_secret?: string;
	stripe_enabled?: boolean;
}

function rowToRecord(row: PaymentSettingsRow): PaymentSettingsRecord {
	return {
		publishableKey: row.stripe_publishable_key || '',
		secretKey: row.stripe_secret_key || '',
		webhookSecret: row.stripe_webhook_secret || '',
		enabled: row.stripe_enabled !== false
	};
}

const REQUIRED_SETTINGS_FIELDS: Array<{ name: string; type: 'text' | 'bool' }> = [
	{ name: 'stripe_publishable_key', type: 'text' },
	{ name: 'stripe_secret_key', type: 'text' },
	{ name: 'stripe_webhook_secret', type: 'text' },
	{ name: 'stripe_enabled', type: 'bool' }
];

/**
 * Ensure the private collection exists (first-visit bootstrap) and backfill
 * any missing fields (a bare table without fields silently drops saves).
 * All API rules stay null so the public API can never read gateway secrets.
 */
export async function ensurePaymentSettingsCollection(pb: TypedPocketBase): Promise<void> {
	let definition: {
		id: string;
		fields?: Array<{ name: string; [key: string]: unknown }>;
	} | null = null;
	try {
		definition = await pb.collections.getOne(Collections.PaymentSettings);
	} catch (err: unknown) {
		if (getErrorStatus(err) !== 404) throw err;
	}

	if (!definition) {
		await pb.collections.create({
			name: Collections.PaymentSettings,
			type: 'base',
			listRule: null,
			viewRule: null,
			createRule: null,
			updateRule: null,
			deleteRule: null,
			schema: REQUIRED_SETTINGS_FIELDS.map((field) => ({ ...field, required: false }))
		});
		return;
	}

	const present = new Set((definition.fields ?? []).map((field) => field.name));
	const missing = REQUIRED_SETTINGS_FIELDS.filter((field) => !present.has(field.name));
	if (missing.length === 0) return;

	await pb.collections.update(definition.id, {
		fields: [
			...(definition.fields ?? []),
			...missing.map((field) => ({ ...field, required: false }))
		]
	});
}

async function getSettingsRowWithClient(pb: TypedPocketBase): Promise<PaymentSettingsRow | null> {
	try {
		const rows = await pb.collection(Collections.PaymentSettings).getFullList<PaymentSettingsRow>({
			batch: 1
		});
		return rows[0] ?? null;
	} catch (err: unknown) {
		if (getErrorStatus(err) === 404) return null;
		throw err;
	}
}

/** Create or update the singleton settings row (testable seam, no auth wrapper). */
export async function upsertSettingsRowWithClient(
	pb: TypedPocketBase,
	data: NormalizedPaymentSettings
): Promise<PaymentSettingsRow> {
	const row = await getSettingsRowWithClient(pb);
	const payload: Record<string, unknown> = {};
	if (data.publishableKey !== undefined) payload.stripe_publishable_key = data.publishableKey;
	if (data.secretKey !== undefined) payload.stripe_secret_key = data.secretKey;
	if (data.webhookSecret !== undefined) payload.stripe_webhook_secret = data.webhookSecret;
	if (data.enabled !== undefined) payload.stripe_enabled = data.enabled;

	if (row) {
		return pb.collection(Collections.PaymentSettings).update<PaymentSettingsRow>(row.id, payload);
	}
	return pb.collection(Collections.PaymentSettings).create<PaymentSettingsRow>(payload);
}

function readEnvConfig() {
	return {
		publishableKey: publicEnv.PUBLIC_STRIPE_KEY,
		secretKey: privateEnv.STRIPE_SECRET_KEY,
		webhookSecret: privateEnv.STRIPE_WEBHOOK_SECRET
	};
}

async function loadEffectiveConfig(): Promise<EffectivePaymentConfig> {
	return withAdmin(async (pb) => {
		await ensurePaymentSettingsCollection(pb);
		const row = await getSettingsRowWithClient(pb);
		return resolveEffectiveConfig(row ? rowToRecord(row) : null, readEnvConfig());
	});
}

const configCache = createConfigCache({ load: loadEffectiveConfig });

/** Effective Stripe config (database first, env fallback). Cached. */
export async function getPaymentConfig(): Promise<EffectivePaymentConfig> {
	return configCache.get();
}

/** Drop the cached config so the next read picks up admin saves. */
export function invalidatePaymentConfig(): void {
	configCache.invalidate();
}

/** Masked, client-safe projection of the effective config. */
export async function getMaskedPaymentSettings(): Promise<MaskedPaymentSettings> {
	return toMaskedSettings(await getPaymentConfig());
}

/** Admin save (partial update); invalidates the cache on success. */
export async function savePaymentSettings(input: unknown): Promise<MaskedPaymentSettings> {
	const data = normalizePaymentSettings(input);
	const config = await withAdmin(async (pb) => {
		await ensurePaymentSettingsCollection(pb);
		const next = await upsertSettingsRowWithClient(pb, data);
		return resolveEffectiveConfig(rowToRecord(next), readEnvConfig());
	});
	invalidatePaymentConfig();
	return toMaskedSettings(config);
}

export interface ConnectionTestResult {
	ok: boolean;
	accountId?: string;
	message: string;
}

/**
 * Verify a secret key against the live Stripe API. Accepts an explicit
 * candidate (unsaved form input) or falls back to the effective config.
 * The key itself is never logged.
 */
export async function testStripeConnection(candidate?: string): Promise<ConnectionTestResult> {
	let secretKey = candidate?.trim() || '';
	if (!secretKey) {
		try {
			secretKey = (await getPaymentConfig()).secretKey;
		} catch {
			return { ok: false, message: '无法读取支付配置' };
		}
	}
	if (!secretKey) {
		return { ok: false, message: '未配置私钥，无法测试连接' };
	}
	try {
		const probe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia', typescript: true });
		const account = await probe.accounts.retrieve();
		return { ok: true, accountId: account.id, message: `连接成功（${account.id}）` };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, message: `连接失败：${message}` };
	}
}
