import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { TypedPocketBase } from '$lib/pocketbase-types';

// Initialize PocketBase
// Private POCKETBASE_URL is for server-to-server optimization (e.g. http://127.0.0.1:8090)
// It falls back to PUBLIC_POCKETBASE_URL if not provided.
const pbUrl = env.POCKETBASE_URL || publicEnv.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Global server-side instance (for non-admin operations like user auth)
export const pb = new PocketBase(pbUrl) as TypedPocketBase;

// Re-export unified image utilities
export { getFileUrl, resolvePocketBaseImage, resolvePocketBaseGallery } from '$lib/utils/image';

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

	// Create a fresh instance for this request
	const adminPb = new PocketBase(pbUrl) as TypedPocketBase;
	adminPb.autoCancellation(false);

	try {
		// PocketBase v0.23+ uses _superusers collection instead of admins
		await adminPb.collection('_superusers').authWithPassword(email, password);
		return adminPb;
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('❌ Admin authentication failed:', message);
		throw err;
	}
}

// Prevent auto-cancellation of pending requests to ensure server-side calls finish
pb.autoCancellation(false);
