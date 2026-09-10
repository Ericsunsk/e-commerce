import { describe, it, expect } from 'vitest';
import { GLOBAL_SETTINGS_FIELDS, normalizeSiteSettings } from './site-settings';

describe('site settings', () => {
	it('exposes typed field definitions for the dynamic form', () => {
		expect(GLOBAL_SETTINGS_FIELDS.map((f) => f.key)).toEqual([
			'site_name',
			'currency_code',
			'currency_symbol',
			'shipping_threshold',
			'maintenance_mode'
		]);
		expect(GLOBAL_SETTINGS_FIELDS.find((f) => f.key === 'maintenance_mode')?.type).toBe('boolean');
	});

	it('validates partial saves with bounds', () => {
		expect(normalizeSiteSettings({})).toEqual({});
		expect(normalizeSiteSettings({ currency_code: 'usd' })).toEqual({ currency_code: 'USD' });
		expect(normalizeSiteSettings({ shipping_threshold: 99, maintenance_mode: true })).toMatchObject(
			{
				shipping_threshold: 99,
				maintenance_mode: true
			}
		);

		for (const bad of [
			null,
			{ site_name: 'x' },
			{ currency_code: 'US' },
			{ currency_symbol: '' },
			{ currency_symbol: '$$$$' },
			{ shipping_threshold: -1 },
			{ maintenance_mode: 1 }
		]) {
			try {
				normalizeSiteSettings(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});
});
