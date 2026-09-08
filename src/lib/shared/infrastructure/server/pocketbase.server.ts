import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { TypedPocketBase } from '$shared/infrastructure/pocketbase-types';

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

/**
 * Create a NEW PocketBase instance authenticated as admin.
 * This avoids concurrent request issues with shared global instance.
 */
export async function createAdminClient(): Promise<TypedPocketBase> {
	const { email, password } = getAdminCredentials();

	if (!email || !password) {
		throw new Error('Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD environment variables');
	}

	const adminPb = new PocketBase(pbUrl) as TypedPocketBase;
	adminPb.autoCancellation(false);

	try {
		await adminPb.collection('_superusers').authWithPassword(email, password);
		return adminPb;
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('❌ Admin authentication failed:', message);
		throw err;
	}
}

pb.autoCancellation(false);
