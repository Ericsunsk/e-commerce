import { type Handle } from '@sveltejs/kit';
import { checkoutLimiter, apiLimiter } from '$lib/server/limiter';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request } = event;

	// =========================================================================
	// 1. PocketBase Authentication (Server-Side)
	// =========================================================================

	// Use private URL for server-to-server communication if available, else public
	const pbUrl = privateEnv.POCKETBASE_URL || env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

	event.locals.pb = new PocketBase(pbUrl);

	// Load the auth store from the cookie
	event.locals.pb.authStore.loadFromCookie(request.headers.get('cookie') || '');

	try {
		// Get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
		}
	} catch (_) {
		// Clear the auth store on any error
		event.locals.pb.authStore.clear();
	}

	// Expose the user model to the client-side via event.locals
	event.locals.user = event.locals.pb.authStore.record as unknown as any; // Cast to any/unknown to bypass strict type mismatch for now

	// =========================================================================
	// 2. Rate Limiting
	// =========================================================================

	// Strict Limiter for Checkout & Payment endpoints
	// Only apply to mutation requests (POST, PUT, PATCH, DELETE) or sensitive GETs if needed
	if (
		request.method === 'POST' &&
		(url.pathname.startsWith('/api/checkout') ||
			url.pathname.startsWith('/api/payment-intent') ||
			url.pathname === '/checkout')
	) {
		if (await checkoutLimiter.isLimited(event)) {
			// Return 429 Too Many Requests
			return new Response('Too many requests. Please try again later.', {
				status: 429,
				headers: { 'Retry-After': '60' }
			});
		}
	}

	// Moderate Limiter for other API endpoints
	if (url.pathname.startsWith('/api/')) {
		// Skip webhook endpoint from rate limiting (Stripe calls this)
		if (!url.pathname.startsWith('/api/webhooks')) {
			if (await apiLimiter.isLimited(event)) {
				return new Response('API rate limit exceeded.', {
					status: 429,
					headers: { 'Retry-After': '60' }
				});
			}
		}
	}

	// =========================================================================
	// 3. Response Resolution & Cookie Handling
	// =========================================================================

	const response = await resolve(event);

	// Send the auth cookie back to the client
	response.headers.append(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({
			httpOnly: false, // Must be false to be accessible by JS client SDK
			secure: url.protocol === 'https:',
			sameSite: 'Lax',
			path: '/'
		})
	);

	return response;
};
