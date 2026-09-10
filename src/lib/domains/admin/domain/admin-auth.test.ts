import { describe, it, expect } from 'vitest';
import {
	isAdminPath,
	isAdminLoginPath,
	adminLoginRedirect,
	resolveAdminAccess,
	isSuperuserRecord,
	buildAdminSessionCookie,
	clearAdminSessionCookie,
	extractAdminToken
} from './admin-auth';

describe('admin route guard', () => {
	it('matches admin paths without catching lookalikes', () => {
		expect(isAdminPath('/admin')).toBe(true);
		expect(isAdminPath('/admin/orders/123')).toBe(true);
		expect(isAdminPath('/api/admin/products/x/toggle')).toBe(true);
		expect(isAdminPath('/administrator')).toBe(false);
		expect(isAdminPath('/api/products')).toBe(false);
		expect(isAdminPath('/shop')).toBe(false);
		expect(isAdminLoginPath('/admin/login')).toBe(true);
		expect(isAdminLoginPath('/admin/orders')).toBe(false);
	});

	it('preserves deep links in the login redirect', () => {
		expect(adminLoginRedirect('/admin/orders')).toBe('/admin/login?redirect=%2Fadmin%2Forders');
	});

	it('allows public and login paths, gates the rest on a token', () => {
		expect(resolveAdminAccess('/shop', false)).toEqual({ allowed: true });
		expect(resolveAdminAccess('/admin/login', false)).toEqual({ allowed: true });
		expect(resolveAdminAccess('/admin/orders', true)).toEqual({ allowed: true });
		expect(resolveAdminAccess('/admin/orders', false)).toEqual({
			allowed: false,
			redirect: '/admin/login?redirect=%2Fadmin%2Forders'
		});
	});

	it('validates superuser records strictly', () => {
		expect(isSuperuserRecord({ id: 'a', email: 'root@x.com' })).toBe(true);
		expect(isSuperuserRecord({ isSuperuser: true })).toBe(true);
		expect(isSuperuserRecord(null)).toBe(false);
		expect(isSuperuserRecord({ id: 'a' })).toBe(false);
		expect(isSuperuserRecord({ email: 'root@x.com' })).toBe(false);
	});
});

describe('admin session cookie', () => {
	it('round-trips the token through cookie headers', () => {
		const header = buildAdminSessionCookie('tok123', false);
		expect(header).toContain('admin_auth=tok123');
		expect(header).toContain('HttpOnly');
		expect(header).not.toContain('Secure');

		expect(buildAdminSessionCookie('tok123', true)).toContain('Secure');
		expect(extractAdminToken(`other=1; admin_auth=tok123; x=2`)).toBe('tok123');
		expect(extractAdminToken(null)).toBeNull();
		expect(extractAdminToken('admin_auth=')).toBeNull();
		expect(clearAdminSessionCookie()).toContain('Max-Age=0');
	});
});
