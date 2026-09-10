import { describe, it, expect } from 'vitest';
import { formatBytes, toBackupRows } from './backups';

describe('backups view model', () => {
	it('formats byte sizes', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(2048)).toBe('2 KB');
		expect(formatBytes(59_904_141)).toBe('57.1 MB');
		expect(formatBytes(NaN)).toBe('—');
	});

	it('sorts newest first and flags auto backups', () => {
		const rows = toBackupRows([
			{ key: 'manual.zip', size: 100, modified: '2026-09-08' },
			{ key: '@auto_x.zip', size: 200, modified: '2026-09-09' }
		]);
		expect(rows.map((r) => r.key)).toEqual(['@auto_x.zip', 'manual.zip']);
		expect(rows[0]).toMatchObject({ auto: true, sizeFormatted: '200 B' });
		expect(rows[1]).toMatchObject({ auto: false });
	});
});
