import { describe, it, expect } from 'vitest';
import {
	extractAnalyticsDomain,
	buildCspDirectives,
	buildCspHeader,
	applySecurityHeaders,
	createErrorId,
	logServerError,
	toErrorPayload
} from './security-headers.server';

describe('security headers', () => {
	it('extracts the analytics origin from an embed snippet', () => {
		expect(extractAnalyticsDomain('<script src="https://analytics.x.com/a.js">')).toBe(
			'https://analytics.x.com'
		);
		expect(extractAnalyticsDomain(undefined)).toBeNull();
		expect(extractAnalyticsDomain('no src here')).toBeNull();
	});

	it('covers payment, cdn, and analytics origins exactly once', () => {
		const directives = buildCspDirectives({
			pbOrigin: 'https://pb.example.com',
			cdnOrigins: ['https://img.example.com'],
			analyticsOrigins: ['https://analytics.x.com']
		});
		const joined = directives.join('; ');
		for (const origin of [
			'https://js.stripe.com',
			'https://pb.example.com',
			'https://img.example.com',
			'https://analytics.x.com'
		]) {
			expect(joined).toContain(origin);
		}
		expect(directives.some((d) => d.startsWith('frame-ancestors'))).toBe(true);
	});

	it('adds upgrade-insecure-requests only for https', () => {
		expect(buildCspHeader(new URL('https://x.com/'))).toContain('upgrade-insecure-requests');
		expect(buildCspHeader(new URL('http://x.com/'))).not.toContain('upgrade-insecure-requests');
	});

	it('applies the full hardening header set', () => {
		const response = new Response('ok');
		applySecurityHeaders(response, new URL('https://x.com/'));
		expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
		expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
	});
});

describe('server error observability', () => {
	it('creates error ids and sanitizes payloads outside dev', () => {
		expect(createErrorId()).toBe('test-uuid-0000-0000-0000-000000000000');

		const prod = toErrorPayload(new Error('secret stack details'), 'id-1', false);
		expect(prod).toEqual({ message: 'An unexpected error occurred.', errorId: 'id-1' });

		const notFound = toErrorPayload(new Error('not found'), 'id-404', false, 404);
		expect(notFound).toEqual({ message: 'Not Found', errorId: 'id-404' });

		const dev = toErrorPayload(new Error('boom'), 'id-2', true);
		expect(dev).toEqual({ message: 'boom', errorId: 'id-2' });
	});

	it('logs structured diagnostics', () => {
		const logged: string[] = [];
		const orig = console.error;
		console.error = (msg: string) => {
			logged.push(msg);
		};
		try {
			logServerError(
				new Error('boom'),
				{ errorId: 'id-9', path: '/x', status: 500, message: 'boom' },
				true
			);
		} finally {
			console.error = orig;
		}
		const parsed = JSON.parse(logged[0]);
		expect(parsed).toMatchObject({ level: 'error', errorId: 'id-9', path: '/x', status: 500 });
		expect(parsed.stack).toContain('Error');
	});
});
