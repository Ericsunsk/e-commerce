import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { TypedPocketBase } from '$shared/infrastructure/pocketbase-types';
import { AdminTokenCache, getJwtExpiryMs } from '$shared/infrastructure/admin-token-cache';

const pbUrl = env.POCKETBASE_URL || publicEnv.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Global server-side instance (for non-admin operations like user auth)
export const pb = new PocketBase(pbUrl) as TypedPocketBase;

// Cache for admin credentials
let adminEmail: string | undefined;
let adminPassword: string | undefined;

function getAdminCredentials() {
	if (!adminEmail || !adminPassword) {
		adminEmail = env.POCKETBASE_ADMIN_EMAIL || env.PB_ADMIN_EMAIL;
		adminPassword = env.POCKETBASE_ADMIN_PASSWORD || env.PB_ADMIN_PASSWORD;
	}
	return { email: adminEmail, password: adminPassword };
}

async function authenticateAdmin() {
	const { email, password } = getAdminCredentials();

	if (!email || !password) {
		throw new Error('Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD environment variables');
	}

	const loginPb = new PocketBase(pbUrl) as TypedPocketBase;
	loginPb.autoCancellation(false);

	try {
		await loginPb.collection('_superusers').authWithPassword(email, password);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('❌ Admin authentication failed:', message);
		throw err;
	}

	const token = loginPb.authStore.token;
	const record = loginPb.authStore.record;
	loginPb.authStore.clear();

	// Tokens issued by PocketBase always carry `exp`; fall back to a short
	// TTL so an unparseable token can never stay cached indefinitely.
	const expiresAt = (token && getJwtExpiryMs(token)) || Date.now() + 5 * 60_000;
	return { token, record, expiresAt };
}

/**
 * In-memory admin token shared across concurrent server operations.
 * Single-flight: parallel refreshes collapse into one login round-trip.
 */
const adminTokenCache = new AdminTokenCache({ authenticate: authenticateAdmin });

/** Drop the cached admin token so the next call re-authenticates (e.g. after a 401). */
export function invalidateAdminTokenCache(): void {
	adminTokenCache.invalidate();
}

/**
 * Create a NEW PocketBase instance reusing the cached admin token.
 * Per-call instances avoid auth-state races between concurrent requests;
 * only the password login itself is shared via the cache.
 */
export async function createAdminClient(): Promise<TypedPocketBase> {
	const { token, record } = await adminTokenCache.getToken();

	const adminPb = new PocketBase(pbUrl) as TypedPocketBase;
	adminPb.autoCancellation(false);
	adminPb.authStore.save(token, record as never);

	return adminPb;
}

pb.autoCancellation(false);
