import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { TypedPocketBase } from '$lib/pocketbase-types';

// Initialize PocketBase
// Private POCKETBASE_URL is for server-to-server optimization (e.g. http://127.0.0.1:8090)
// It falls back to PUBLIC_POCKETBASE_URL if not provided.
const pbUrl = env.POCKETBASE_URL || publicEnv.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Global server-side instance
export const pb = new PocketBase(pbUrl) as TypedPocketBase;

// Re-export unified image utilities
export { getFileUrl, resolvePocketBaseImage, resolvePocketBaseGallery } from '$lib/utils/image';

/**
 * Initialize admin authentication
 * Returns the global PB instance authenticated as admin
 */
export async function initAdmin() {
	// Check if already authenticated as superuser
	if (pb.authStore.isSuperuser && pb.authStore.isValid) {
		return pb;
	}

	const email = env.POCKETBASE_ADMIN_EMAIL || env.PB_ADMIN_EMAIL;
	const password = env.POCKETBASE_ADMIN_PASSWORD || env.PB_ADMIN_PASSWORD;

	if (!email || !password) {
		throw new Error('Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD environment variables');
	}

	try {
		await pb.admins.authWithPassword(email, password);
		console.log('🛡️  Admin authenticated successfully');
		return pb;
	} catch (err: any) {
		console.error('❌ Admin authentication failed:', err.message);
		throw err;
	}
}

// Prevent auto-cancellation of pending requests to ensure server-side calls finish
pb.autoCancellation(false);
