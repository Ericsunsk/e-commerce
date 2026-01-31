import PocketBase from 'pocketbase';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { getPublicPocketBaseUrl } from '$lib/utils/image';
import { Collections } from '$lib/pocketbase-types';

// =============================================================================
// Client-side PocketBase Instance
// =============================================================================
// This module provides a PocketBase instance for client-side auth operations.
// For server-side data fetching, use $lib/server/pocketbase.ts instead.

// Re-export unified image utilities for client usage
export { getFileUrl, resolvePocketBaseImage, resolvePocketBaseGallery } from '$lib/utils/image';

/**
 * Client-side PocketBase instance
 * Used for authentication operations in the browser
 */
export const pb = new PocketBase(getPublicPocketBaseUrl());

// Persist auth state to cookie on changes (browser only)
if (browser) {
	// Load initial auth state from cookie
	pb.authStore.loadFromCookie(document.cookie);

	// Subscribe to auth changes and persist to cookie
	pb.authStore.onChange(() => {
		// Set cookie with 30 days expiry, secure in production
		document.cookie = pb.authStore.exportToCookie({
			httpOnly: false, // Must be false to access from JS
			secure: location.protocol === 'https:',
			sameSite: 'Lax',
			path: '/'
		});
	});
}

/**
 * User type from PocketBase auth
 */
export interface PBUser {
	id: string;
	email: string;
	name?: string;
	username?: string;
	avatar?: string;
	verified: boolean;
	created: string;
	updated: string;
	// Extended fields from our users collection
	display_name?: string;
	phone?: string;
	stripe_customer_id?: string;
	// Helpers
	isAdmin?: boolean;
}

/**
 * Check if the current user is authenticated
 */
export function isAuthenticated(): boolean {
	return pb.authStore.isValid;
}

/**
 * Helper: Create admin user object from model
 */
function createAdminUser(model: any): PBUser {
	return {
		id: model?.id || '',
		email: model?.email || '',
		name: 'Admin',
		username: 'admin',
		avatar: model?.avatar?.toString(),
		verified: true,
		created: model?.created || '',
		updated: model?.updated || '',
		display_name: 'Administrator',
		isAdmin: true
	};
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): PBUser | null {
	if (!pb.authStore.isValid) return null;

	// Check if superuser (admin) - isSuperuser is the new API
	if (pb.authStore.isSuperuser) {
		return createAdminUser(pb.authStore.record);
	}

	return pb.authStore.record as unknown as PBUser;
}

/**
 * Register a new user
 */
export async function register(
	email: string,
	password: string,
	passwordConfirm: string,
	name?: string
): Promise<PBUser> {
	const data = {
		email,
		password,
		passwordConfirm,
		display_name: name || email.split('@')[0],
		name: name || email.split('@')[0]
	};

	// Create the user
	const user = await pb.collection(Collections.Users).create<PBUser>(data);

	// Request verification email
	await pb.collection(Collections.Users).requestVerification(email);

	return user;
}

/**
 * Login with Google OAuth2
 */
export async function loginWithGoogle(): Promise<void> {
	await pb.collection(Collections.Users).authWithOAuth2({ provider: 'google' });
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<PBUser> {
	try {
		// Try user login first
		const authData = await pb.collection(Collections.Users).authWithPassword(email, password);
		return authData.record as unknown as PBUser;
	} catch (err) {
		try {
			// Fallback to admin login
			const authData: any = await pb.admins.authWithPassword(email, password);
			return createAdminUser(authData.admin);
		} catch (adminErr) {
			// Throw the original error if both fail, or the admin error
			throw err;
		}
	}
}

/**
 * Logout the current user
 */
export function logout(): void {
	pb.authStore.clear();
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email: string): Promise<boolean> {
	await pb.collection(Collections.Users).requestPasswordReset(email);
	return true;
}

/**
 * Update current user profile
 */
export async function updateProfile(data: Partial<PBUser>): Promise<PBUser> {
	const user = getCurrentUser();
	if (!user) throw new Error('Not authenticated');

	const updated = await pb.collection(Collections.Users).update<PBUser>(user.id, data);
	return updated;
}
