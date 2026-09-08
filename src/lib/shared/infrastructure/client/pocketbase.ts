import PocketBase from 'pocketbase';
import { browser } from '$app/environment';
import { getPublicPocketBaseUrl } from '$shared/kernel';

/**
 * Client-side PocketBase instance
 * Used for authentication operations in the browser
 */
export const pb = new PocketBase(getPublicPocketBaseUrl());

// Persist auth state to cookie on changes (browser only)
if (browser) {
	pb.authStore.loadFromCookie(document.cookie);

	pb.authStore.onChange(() => {
		document.cookie = pb.authStore.exportToCookie({
			httpOnly: false,
			secure: location.protocol === 'https:',
			sameSite: 'Lax',
			path: '/'
		});
	});
}
