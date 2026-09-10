import { describe, it, expect, vi } from 'vitest';
import {
	getS3WithClient,
	saveS3WithClient,
	testS3WithClient,
	getBackupsWithClient,
	saveBackupsWithClient
} from './platform-settings.server';

function fakePb(state: {
	s3?: Record<string, unknown>;
	backups?: Record<string, unknown>;
	testS3?: 'ok' | 'fail';
}) {
	return {
		settings: {
			getAll: vi.fn().mockResolvedValue({ s3: state.s3 ?? {}, backups: state.backups ?? {} }),
			update: vi.fn().mockImplementation(async (patch: Record<string, unknown>) => {
				Object.assign(state.s3 ?? {}, (patch.s3 ?? {}) as object);
				Object.assign(state.backups ?? {}, (patch.backups ?? {}) as object);
				return patch;
			}),
			testS3: vi.fn().mockImplementation(async () => {
				if (state.testS3 === 'fail') throw new Error('S3 unreachable');
				return true;
			})
		}
	};
}

describe('s3 seams', () => {
	it('reads raw config passthrough', async () => {
		expect(await getS3WithClient(fakePb({}) as never)).toEqual({});
		expect(
			await getS3WithClient(fakePb({ s3: { bucket: 'media', enabled: true } }) as never)
		).toMatchObject({ bucket: 'media', enabled: true });
	});

	it('merges partial saves without wiping stored keys', async () => {
		const pb = fakePb({ s3: { bucket: 'old', accessKey: 'AKIA', secret: 'shhh' } });
		const next = await saveS3WithClient(pb as never, { bucket: 'new' });
		expect(next).toMatchObject({ bucket: 'new', accessKey: 'AKIA', secret: 'shhh' });
	});

	it('tests connectivity and rejects unknown filesystems', async () => {
		expect(await testS3WithClient(fakePb({}) as never, 'storage')).toMatchObject({ ok: true });
		expect(await testS3WithClient(fakePb({ testS3: 'fail' }) as never, 'backups')).toMatchObject({
			ok: false
		});
		try {
			await testS3WithClient(fakePb({}) as never, 'nope');
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ status: 400 });
		}
	});
});

describe('backup schedule seams', () => {
	it('reads defaults and persists partial updates', async () => {
		expect(await getBackupsWithClient(fakePb({}) as never)).toEqual({
			cron: '0 0 * * *',
			cronMaxKeep: 3
		});
		const pb = fakePb({ backups: { cron: '0 0 * * *', cronMaxKeep: 3 } });
		expect(await saveBackupsWithClient(pb as never, { cronMaxKeep: 7 })).toEqual({
			cron: '0 0 * * *',
			cronMaxKeep: 7
		});
	});
});
