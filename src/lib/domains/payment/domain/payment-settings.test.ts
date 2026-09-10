import { describe, it, expect, vi } from 'vitest';
import {
	maskSecret,
	normalizePaymentSettings,
	resolveEffectiveConfig,
	toMaskedSettings,
	createConfigCache
} from './payment-settings';

describe('payment settings', () => {
	it('masks secrets with prefix and suffix', () => {
		expect(maskSecret('')).toBe('');
		expect(maskSecret(null)).toBe('');
		expect(maskSecret('short')).toBe('...');
		expect(maskSecret('sk_test_51H7x9q2abc')).toBe('sk_test_...2abc');
	});

	it('validates partial saves with key prefixes', () => {
		expect(normalizePaymentSettings({})).toEqual({});
		expect(
			normalizePaymentSettings({ publishableKey: 'pk_test_123', enabled: false })
		).toEqual({ publishableKey: 'pk_test_123', enabled: false });
		expect(normalizePaymentSettings({ secretKey: '' })).toEqual({ secretKey: '' });

		for (const bad of [
			null,
			{ publishableKey: 'xx_123' },
			{ secretKey: 'pk_test_123' },
			{ webhookSecret: 'secret' },
			{ enabled: 'yes' }
		]) {
			try {
				normalizePaymentSettings(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('falls back to env per field', () => {
		const env = { publishableKey: 'pk_env', secretKey: 'sk_env', webhookSecret: 'whsec_env' };
		expect(resolveEffectiveConfig(null, env)).toMatchObject({
			publishableKey: 'pk_env',
			source: 'env',
			enabled: true
		});
		expect(
			resolveEffectiveConfig(
				{ publishableKey: '', secretKey: 'sk_db', webhookSecret: '', enabled: false },
				env
			)
		).toMatchObject({ publishableKey: 'pk_env', secretKey: 'sk_db', enabled: false, source: 'database' });
	});

	it('projects masked client-safe settings', () => {
		const masked = toMaskedSettings({
			publishableKey: 'pk_test_1',
			secretKey: 'sk_test_abcdef123456',
			webhookSecret: '',
			enabled: true,
			source: 'database'
		});
		expect(masked.secretMasked).toContain('...');
		expect(masked.hasSecret).toBe(true);
		expect(masked.hasWebhookSecret).toBe(false);
		expect(JSON.stringify(masked)).not.toContain('abcdef123456');
	});
});

describe('config cache', () => {
	it('caches, expires by ttl, and invalidates hot', async () => {
		let now = 1000;
		const load = vi.fn().mockResolvedValue({ v: 1 });
		const cache = createConfigCache({ load, now: () => now, ttlMs: 60_000 });

		expect(await cache.get()).toEqual({ v: 1 });
		expect(await cache.get()).toEqual({ v: 1 });
		expect(load).toHaveBeenCalledTimes(1);

		now += 61_000;
		await cache.get();
		expect(load).toHaveBeenCalledTimes(2);

		cache.invalidate();
		await cache.get();
		expect(load).toHaveBeenCalledTimes(3);
	});

	it('single-flights concurrent refreshes', async () => {
		let release!: (v: object) => void;
		const gate = new Promise<object>((resolve) => {
			release = resolve;
		});
		const load = vi.fn().mockReturnValue(gate);
		const cache = createConfigCache({ load });
		const pending = Promise.all([cache.get(), cache.get()]);
		release({ v: 1 });
		expect(await pending).toEqual([{ v: 1 }, { v: 1 }]);
		expect(load).toHaveBeenCalledTimes(1);
	});
});
