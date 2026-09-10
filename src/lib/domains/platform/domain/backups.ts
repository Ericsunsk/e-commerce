/**
 * Backup management view model (pure domain).
 */

export interface BackupRow {
	key: string;
	size: number;
	sizeFormatted: string;
	modified: string;
	auto: boolean;
}

/** Human-readable byte size (B/KB/MB/GB). */
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '—';
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unit]}`;
}

/** Pure row projection, newest first. */
export function toBackupRows(
	files: Array<{ key: string; size: number; modified: string }>
): BackupRow[] {
	return [...files]
		.sort((a, b) => (a.modified < b.modified ? 1 : -1))
		.map((file) => ({
			key: file.key,
			size: file.size,
			sizeFormatted: formatBytes(file.size),
			modified: file.modified,
			auto: file.key.startsWith('@auto_') || file.key.startsWith('auto_')
		}));
}
