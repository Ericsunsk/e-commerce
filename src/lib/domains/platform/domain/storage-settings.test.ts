import { describe, it, expect } from 'vitest';
import { normalizeS3Settings, normalizeBackupSchedule, toMaskedS3 } from './storage-settings';

describe('storage settings', () => {
	it('accepts partial saves with bounds', () => {
		expect(normalizeS3Settings({})).toEqual({});
		expect(
			normalizeS3Settings({ enabled: true, bucket: 'media', endpoint: 'https://s3.example.com' })
		).toMatchObject({ enabled: true, bucket: 'media' });

		for (const bad of [
			null,
			{ enabled: 'yes' },
			{ enabled: true, bucket: '' },
			{ endpoint: 'not-a-url' },
			{ forcePathStyle: 1 }
		]) {
			try {
				normalizeS3Settings(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('validates backup schedules', () => {
		expect(normalizeBackupSchedule({ cron: '0 0 * * *', cronMaxKeep: 3 })).toEqual({
			cron: '0 0 * * *',
			cronMaxKeep: 3
		});
		for (const bad of [null, { cron: 'daily' }, { cron: '0 0 * *' }, { cronMaxKeep: 0 }, { cronMaxKeep: 101 }]) {
			try {
				normalizeBackupSchedule(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('masks keys behind presence flags', () => {
		const masked = toMaskedS3({
			enabled: true,
			bucket: 'b',
			region: 'auto',
			endpoint: 'https://x',
			accessKey: 'AKIA...',
			secret: 'shhh',
			forcePathStyle: true
		});
		expect(masked.hasAccessKey).toBe(true);
		expect(JSON.stringify(masked)).not.toContain('shhh');
		expect('secret' in masked).toBe(false);
	});
});
