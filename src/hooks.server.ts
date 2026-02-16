import { type Handle } from '@sveltejs/kit';
import { checkoutLimiter, apiLimiter } from '$lib/server/limiter';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import type { TypedPocketBase, UsersResponse } from '$lib/pocketbase-types';

function buildCspHeader(url: URL): string {
	const isHttps = url.protocol === 'https:';

	const directives = [
		"default-src 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		"img-src 'self' data: blob: https: http:",
		"font-src 'self' https: data:",
		"style-src 'self' 'unsafe-inline' https:",
		"script-src 'self' 'unsafe-inline' https://js.stripe.com",
		'frame-src https://js.stripe.com https://hooks.stripe.com',
		"connect-src 'self' https: http: ws: wss:",
		"worker-src 'self' blob:"
	];

	if (isHttps) {
		directives.push('upgrade-insecure-requests');
	}

	return directives.join('; ');
}

function applySecurityHeaders(response: Response, url: URL): void {
	response.headers.set('Content-Security-Policy', buildCspHeader(url));
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
	);

	if (url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
}

function isPrivatePath(pathname: string): boolean {
	if (pathname.startsWith('/api/')) return true;
	if (pathname.startsWith('/account')) return true;
	if (pathname.startsWith('/checkout')) return true;
	if (pathname.startsWith('/wishlist')) return true;
	if (pathname.startsWith('/cart')) return true;
	return false;
}

function applyCacheHeaders(
	response: Response,
	url: URL,
	request: Request,
	args: { hasAuthCookie: boolean }
): void {
	if (response.headers.has('cache-control') || response.headers.has('Cache-Control')) return;
	if (url.pathname.startsWith('/_app/')) return;

	// Never cache mutations.
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		response.headers.set('Cache-Control', 'no-store');
		return;
	}

	// Never cache API responses.
	if (url.pathname.startsWith('/api/')) {
		response.headers.set('Cache-Control', 'no-store');
		return;
	}

	// Avoid caching authenticated or user-specific pages.
	if (args.hasAuthCookie || isPrivatePath(url.pathname)) {
		response.headers.set('Cache-Control', 'no-store');
		return;
	}

	// Light edge caching for anonymous public pages.
	response.headers.set(
		'Cache-Control',
		'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request } = event;
	const cookieHeader = request.headers.get('cookie') || '';
	const hasAuthCookie = cookieHeader.includes('pb_auth=');
	const disableRateLimit =
		import.meta.env.DEV ||
		privateEnv.DISABLE_RATE_LIMITER === '1' ||
		privateEnv.DISABLE_RATE_LIMITER === 'true';

	// =========================================================================
	// 1. PocketBase Authentication (Server-Side)
	// =========================================================================

	// Use private URL for server-to-server communication if available, else public
	const pbUrl = privateEnv.POCKETBASE_URL || env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

	event.locals.pb = new PocketBase(pbUrl) as unknown as TypedPocketBase;

	// Load the auth store from the cookie
	event.locals.pb.authStore.loadFromCookie(cookieHeader);

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
	const record = event.locals.pb.authStore.record;
	event.locals.user = record ? (record as unknown as UsersResponse) : null;

	// =========================================================================
	// 2. Rate Limiting
	// =========================================================================

	if (!disableRateLimit) {
		// Strict Limiter for Checkout & Payment endpoints
		// Only apply to mutation requests (POST, PUT, PATCH, DELETE) or sensitive GETs if needed
		if (
			request.method === 'POST' &&
			(url.pathname.startsWith('/api/payment-intent') || url.pathname === '/checkout')
		) {
			if (await checkoutLimiter.isLimited(event)) {
				// Return 429 Too Many Requests
				const response = new Response('Too many requests. Please try again later.', {
					status: 429,
					headers: { 'Retry-After': '60' }
				});
				response.headers.set('Cache-Control', 'no-store');
				applySecurityHeaders(response, url);
				return response;
			}
		}

		// Moderate Limiter for other API endpoints
		if (url.pathname.startsWith('/api/')) {
			// Skip webhook endpoint from rate limiting (Stripe calls this)
			if (!url.pathname.startsWith('/api/webhooks')) {
				if (await apiLimiter.isLimited(event)) {
					const response = new Response('API rate limit exceeded.', {
						status: 429,
						headers: { 'Retry-After': '60' }
					});
					response.headers.set('Cache-Control', 'no-store');
					applySecurityHeaders(response, url);
					return response;
				}
			}
		}
	}

	// =========================================================================
	// 3. Response Resolution & Cookie Handling
	// =========================================================================

	const response = await resolve(event);

	// Send the auth cookie back to the client
	const authCookie = event.locals.pb.authStore.exportToCookie({
		httpOnly: false, // Must be false to be accessible by JS client SDK
		secure: url.protocol === 'https:',
		sameSite: 'Lax',
		path: '/'
	});
	if (hasAuthCookie || event.locals.pb.authStore.isValid) {
		response.headers.append('set-cookie', authCookie);
	}

	applySecurityHeaders(response, url);
	applyCacheHeaders(response, url, request, { hasAuthCookie });

	return response;
};
