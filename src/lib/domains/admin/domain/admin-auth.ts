/**
 * Admin auth decisions (pure domain).
 *
 * Centralizes admin route matching, login redirects, and session cookie
 * handling so hooks, layouts, and tests share one implementation.
 */

export const ADMIN_SESSION_COOKIE = 'admin_auth';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

export function isAdminPath(pathname: string): boolean {
	if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
	return pathname === '/api/admin' || pathname.startsWith('/api/admin/');
}

export function isAdminLoginPath(pathname: string): boolean {
	return pathname === '/admin/login' || pathname.startsWith('/admin/login/');
}

/** Where to send unauthenticated admin traffic (preserves deep links). */
export function adminLoginRedirect(pathname: string, search = ''): string {
	const target = `${pathname}${search}`;
	return `/admin/login?redirect=${encodeURIComponent(target)}`;
}

export type AdminAccess = { allowed: true } | { allowed: false; redirect: string };

/** Pure guard decision: login page always passes, others need a session token. */
export function resolveAdminAccess(pathname: string, hasSessionToken: boolean): AdminAccess {
	if (!isAdminPath(pathname)) return { allowed: true };
	if (isAdminLoginPath(pathname)) return { allowed: true };
	if (hasSessionToken) return { allowed: true };
	return { allowed: false, redirect: adminLoginRedirect(pathname) };
}

/** A `_superusers` auth record is valid when present (collection implies role). */
export function isSuperuserRecord(record: unknown): boolean {
	if (!record || typeof record !== 'object') return false;
	const entry = record as Record<string, unknown>;
	if (entry.isSuperuser === true) return true;
	return typeof entry.id === 'string' && typeof entry.email === 'string';
}

export function buildAdminSessionCookie(token: string, secure: boolean): string {
	const parts = [
		`${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
		'Path=/',
		`Max-Age=${COOKIE_MAX_AGE}`,
		'HttpOnly',
		'SameSite=Lax'
	];
	if (secure) parts.push('Secure');
	return parts.join('; ');
}

export function clearAdminSessionCookie(): string {
	return `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/** Extract the admin token from a raw `Cookie` header (no dependencies). */
export function extractAdminToken(cookieHeader: string | null | undefined): string | null {
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(';')) {
		const index = part.indexOf('=');
		if (index === -1) continue;
		if (part.slice(0, index).trim() !== ADMIN_SESSION_COOKIE) continue;
		const value = decodeURIComponent(part.slice(index + 1).trim());
		return value || null;
	}
	return null;
}
