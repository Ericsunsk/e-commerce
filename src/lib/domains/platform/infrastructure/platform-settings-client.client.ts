/**
 * Platform settings HTTP client (browser-side).
 *
 * Every call here replaces a hand-rolled `fetch` + `res.ok` + `body.error`
 * sequence in the admin settings page. That sequence is exactly what
 * `apiClient` already does, and repeating it per call site meant 46 places
 * could each get the error handling subtly different.
 *
 * Endpoint paths live here, not in the page, so the client and the
 * `+server.ts` route can be read against each other.
 */

import { apiClient } from '$shared/infrastructure';
import type { BackupSchedule, MaskedS3 } from '../domain/storage-settings';

/**
 * Connectivity probes return the domain's `{ ok, message }` spread alongside
 * `apiHandler`'s `success: true` — so both are present on the wire. Typed here
 * once instead of being guessed at each call site.
 */
export interface TestProbeResult {
	success: boolean;
	ok: boolean;
	message?: string;
}

// --- SMTP ---

export interface SmtpSettingsView {
	host: string;
	port: number;
	username: string;
	authMethod: string;
	tls: boolean;
	enabled: boolean;
	fromAddress: string;
	fromName: string;
	hasPassword: boolean;
}

export async function fetchSmtpSettings(): Promise<SmtpSettingsView> {
	const data = await apiClient<{ settings: SmtpSettingsView }>('/api/admin/smtp-settings');
	return data.settings;
}

export async function saveSmtpSettings(
	payload: Partial<SmtpSettingsView> & { password?: string }
): Promise<SmtpSettingsView> {
	const data = await apiClient<{ settings: SmtpSettingsView }>('/api/admin/smtp-settings', {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
	return data.settings;
}

/** Send a template test email to `toEmail`. */
export async function sendSmtpTestEmail(payload: {
	toEmail: string;
	template: string;
}): Promise<TestProbeResult> {
	return apiClient<TestProbeResult>('/api/admin/smtp/test', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

// --- S3 / storage ---

/**
 * The API's masked S3 projection. Reuses the domain's `MaskedS3` rather than a
 * hand-written shape — an invented type here silently drifts from what the
 * endpoint actually masks (it did: I first wrote `hasSecretKey`/`publicUrl`,
 * neither of which the API sends).
 */
export type StorageSettingsView = MaskedS3;

export async function fetchStorageSettings(): Promise<StorageSettingsView> {
	const data = await apiClient<{ settings: StorageSettingsView }>('/api/admin/s3-settings');
	return data.settings;
}

export async function saveStorageSettings(
	payload: Record<string, unknown>
): Promise<StorageSettingsView> {
	const data = await apiClient<{ settings: StorageSettingsView }>('/api/admin/s3-settings', {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
	return data.settings;
}

export async function testStorageConnection(
	filesystem: 'storage' | 'backups'
): Promise<TestProbeResult> {
	return apiClient<TestProbeResult>(
		`/api/admin/s3/test?filesystem=${encodeURIComponent(filesystem)}`,
		{ method: 'POST' }
	);
}

// --- Backup schedule ---

/** Reuses the domain's `BackupSchedule` (fields are `cron` + `cronMaxKeep`). */
export type BackupScheduleView = BackupSchedule;

export async function fetchBackupSchedule(): Promise<BackupScheduleView> {
	const data = await apiClient<{ settings: BackupScheduleView }>('/api/admin/backup-schedule');
	return data.settings;
}

export async function saveBackupSchedule(
	payload: Record<string, unknown>
): Promise<BackupScheduleView> {
	const data = await apiClient<{ settings: BackupScheduleView }>('/api/admin/backup-schedule', {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
	return data.settings;
}
