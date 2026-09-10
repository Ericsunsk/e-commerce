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
	return privateEnv.POCKETBASE_URL || publicEnv.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
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
		throw { status: 401, message: '管理员账号或密码错误' };
	}

	const token = pb.authStore.token;
	const record = pb.authStore.record as unknown as { email?: string } | null;
	pb.authStore.clear();

	if (!token || !isSuperuserRecord(record)) {
		throw { status: 401, message: '管理员账号或密码错误' };
	}
	return { token, email: record?.email ?? email.trim() };
}

// In-memory cache for validated tokens to avoid round-trips on every request
interface ValidatedSession {
	email: string;
	expiresAt: number;
}
const sessionCache = new Map<string, ValidatedSession>();

/** Validate a session token; returns the admin email or null. */
export async function validateAdminSessionToken(token: string): Promise<string | null> {
	if (!token) return null;

	const now = Date.now();
	const cached = sessionCache.get(token);
	if (cached && cached.expiresAt > now) {
		return cached.email;
	}

	const pb = new PocketBase(resolvePbUrl());
	pb.autoCancellation(false);

	try {
		pb.authStore.save(token);
		const authData = await pb.collection('_superusers').authRefresh();
		const record = (authData?.record || pb.authStore.record) as unknown as {
			email?: string;
			id?: string;
		} | null;

		if (!isSuperuserRecord(record)) {
			pb.authStore.clear();
			sessionCache.delete(token);
			return null;
		}

		const email = typeof record?.email === 'string' ? record.email : null;
		if (email) {
			// Cache for 5 minutes
			sessionCache.set(token, { email, expiresAt: now + 5 * 60 * 1000 });
		}
		return email;
	} catch {
		pb.authStore.clear();
		sessionCache.delete(token);
		return null;
	}
}
