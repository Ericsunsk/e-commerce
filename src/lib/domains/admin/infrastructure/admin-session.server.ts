/**
 * Admin session management (server-only).
 *
 * Authenticates PocketBase `_superusers` and validates per-request session
 * tokens issued at `/admin/login`. Each call uses a fresh PocketBase
 * instance so concurrent admin requests never share auth state.
 */
import PocketBase from 'pocketbase';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { isSuperuserRecord } from '../domain/admin-auth';

function resolvePbUrl(): string {
	return (
		privateEnv.POCKETBASE_URL || publicEnv.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
	);
}

export interface AdminSession {
	token: string;
	email: string;
}

/** Verify superuser credentials; throws with `status: 401` when rejected. */
export async function createAdminSession(email: string, password: string): Promise<AdminSession> {
	const pb = new PocketBase(resolvePbUrl());
	pb.autoCancellation(false);

	try {
		await pb.collection('_superusers').authWithPassword(email.trim(), password);
	} catch {
		throw { status: 401, message: 'Invalid admin credentials' };
	}

	const token = pb.authStore.token;
	const record = pb.authStore.record as unknown as { email?: string } | null;
	pb.authStore.clear();

	if (!token || !isSuperuserRecord(record)) {
		throw { status: 401, message: 'Invalid admin credentials' };
	}
	return { token, email: record?.email ?? email.trim() };
}

/** Validate a session token; returns the admin email or null. */
export async function validateAdminSessionToken(token: string): Promise<string | null> {
	if (!token) return null;
	const pb = new PocketBase(resolvePbUrl());
	pb.autoCancellation(false);

	try {
		pb.authStore.save(token);
		const record = await pb.collection('_superusers').authRefresh();
		if (!isSuperuserRecord(record)) {
			pb.authStore.clear();
			return null;
		}
		const email = (record as unknown as { email?: string }).email;
		return typeof email === 'string' ? email : null;
	} catch {
		pb.authStore.clear();
		return null;
	}
}
