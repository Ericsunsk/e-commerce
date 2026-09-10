/**
 * CMS site settings admin (server-only).
 */
import { withAdmin } from '$shared/infrastructure/server';
import {
	Collections,
	type GlobalSettingsResponse,
	type TypedPocketBase
} from '$shared/infrastructure';
import {
	GLOBAL_SETTINGS_FIELDS,
	normalizeSiteSettings,
	type NormalizedSiteSettings
} from '../domain/site-settings';

export { GLOBAL_SETTINGS_FIELDS };

export interface AdminSiteSettings {
	id: string | null;
	values: Record<string, string | number | boolean>;
	iconUrl: string | null;
}

/** Read the singleton settings row for the admin form. */
export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
	return withAdmin(readAdminSiteSettings);
}

/** Persist a partial settings update (creates the row when missing). */
export async function saveAdminSiteSettings(input: unknown): Promise<AdminSiteSettings> {
	const data: NormalizedSiteSettings = normalizeSiteSettings(input);
	return withAdmin(async (pb) => {
		const result = await pb.collection(Collections.GlobalSettings).getList(1, 1);
		if (result.items.length === 0) {
			await pb.collection(Collections.GlobalSettings).create(data);
		} else {
			await pb.collection(Collections.GlobalSettings).update(result.items[0].id, data);
		}
		return readAdminSiteSettings(pb);
	});
}

async function readAdminSiteSettings(pb: TypedPocketBase): Promise<AdminSiteSettings> {
	const result = await pb.collection(Collections.GlobalSettings).getList(1, 1);
	if (result.items.length === 0) {
		return { id: null, values: {}, iconUrl: null };
	}
	const record = result.items[0] as GlobalSettingsResponse;
	const values: Record<string, string | number | boolean> = {};
	for (const field of GLOBAL_SETTINGS_FIELDS) {
		const raw = record[field.key];
		if (raw !== undefined && raw !== null) {
			values[field.key] =
				field.type === 'number'
					? Number(raw) || 0
					: field.type === 'boolean'
						? raw === true
						: String(raw);
		}
	}
	return { id: record.id, values, iconUrl: record.icon ? String(record.icon) : null };
}
