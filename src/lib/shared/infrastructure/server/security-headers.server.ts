/**
 * Security headers + server error observability (single source of truth).
 *
 * Owns the Content-Security-Policy construction so `svelte.config.js` and
 * `hooks.server.ts` can no longer drift into conflicting policies, plus the
 * helpers backing SvelteKit's `handleError` hook (correlation IDs +
 * structured logging + sanitized client payloads).
 */

/** Extract the script origin from an analytics embed snippet, if present. */
export function extractAnalyticsDomain(htmlCode: string | undefined): string | null {
	if (!htmlCode) return null;
	const match = htmlCode.match(/src=["'](https?:\/\/[^"']+)["']/);
	if (!match?.[1]) return null;
	try {
		return new URL(match[1]).origin;
	} catch {
		return null;
	}
}

export interface CspOrigins {
	/** e.g. https://pb.example.com — PocketBase API host. */
	pbOrigin?: string | null;
	/** e.g. https://img.example.com — R2/CDN image hosts. */
	cdnOrigins?: Array<string | null | undefined>;
	/** Analytics script origins (umami, cloudflare insights, custom). */
	analyticsOrigins?: Array<string | null | undefined>;
}

function unique(values: Array<string | null | undefined>): string[] {
	return [...new Set(values.filter((v): v is string => !!v))];
}

export function buildCspDirectives(origins: CspOrigins = {}): string[] {
	const analytics = unique([
		'https://*.umami.is',
		'https://analytics.jevarie.com',
		'https://static.cloudflareinsights.com',
		...(origins.analyticsOrigins ?? [])
	]);
	const imgHosts = unique([
		'https://pb.jevarie.com',
		'https://img.jevarie.com',
		...(origins.cdnOrigins ?? []),
		...(origins.pbOrigin ? [origins.pbOrigin] : []),
		'https://*.stripe.com',
		'https://images.unsplash.com'
	]);
	const connectHosts = unique([
		origins.pbOrigin ?? 'https://pb.jevarie.com',
		'https://api.stripe.com',
		...analytics
	]);

	return [
		"default-src 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		`img-src 'self' data: blob: ${imgHosts.join(' ')}`,
		"font-src 'self' https://fonts.gstatic.com",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		`script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com ${analytics.join(' ')}`,
		'frame-src https://js.stripe.com https://hooks.stripe.com',
		`connect-src 'self' ${connectHosts.join(' ')}`,
		"worker-src 'self' blob:"
	];
}

export function buildCspHeader(url: URL, origins: CspOrigins = {}): string {
	const directives = buildCspDirectives(origins);
	if (url.protocol === 'https:') {
		directives.push('upgrade-insecure-requests');
	}
	return directives.join('; ');
}

export function applySecurityHeaders(response: Response, url: URL, origins: CspOrigins = {}): void {
	response.headers.set('Content-Security-Policy', buildCspHeader(url, origins));
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

// ---------------------------------------------------------------------------
// Server error observability
// ---------------------------------------------------------------------------

/** Unique correlation ID for tracing a server error end-to-end. */
export function createErrorId(): string {
	return crypto.randomUUID();
}

export interface ErrorLogContext {
	errorId: string;
	path: string;
	status: number;
	message: string;
}

/** Structured single-line diagnostics for log aggregation. */
export function logServerError(error: unknown, ctx: ErrorLogContext, isDev: boolean): void {
	console.error(
		JSON.stringify({
			level: 'error',
			...ctx,
			stack: error instanceof Error ? error.stack : undefined,
			cause:
				error instanceof Error && isDev && error.cause !== undefined
					? String(error.cause)
					: undefined
		})
	);
}

/**
 * Sanitized client payload. Unexpected messages are hidden in production so
 * internals never leak; the errorId lets support trace the log line.
 */
export function toErrorPayload(
	error: unknown,
	errorId: string,
	isDev: boolean,
	status?: number
): { message: string; errorId: string } {
	if (status === 404) {
		return { message: 'Not Found', errorId };
	}
	const original = error instanceof Error ? error.message : String(error ?? '');
	return {
		message: isDev && original ? original : 'An unexpected error occurred.',
		errorId
	};
}
