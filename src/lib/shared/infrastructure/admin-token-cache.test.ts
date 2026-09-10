import { describe, it, expect, vi } from 'vitest';
import { AdminTokenCache, getJwtExpiryMs, type AdminCredentials } from './admin-token-cache';

function creds(overrides: Partial<AdminCredentials> = {}): AdminCredentials {
	return { token: 'tok', record: { id: 'admin' }, expiresAt: Date.now() + 3_600_000, ...overrides };
}

function jwt(exp: number): string {
	const b64 = (v: string) => btoa(v).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	return `h.${b64(JSON.stringify({ exp }))}.s`;
}

describe('admin token cache', () => {
	it('reuses the cached token across calls', async () => {
		const authenticate = vi.fn().mockResolvedValue(creds({ token: 'tok-1' }));
		const cache = new AdminTokenCache({ authenticate });

		expect((await cache.getToken()).token).toBe('tok-1');
		expect((await cache.getToken()).token).toBe('tok-1');
		expect(authenticate).toHaveBeenCalledTimes(1);
	});

	it('refreshes automatically after expiry', async () => {
		let now = 1_000_000;
		const authenticate = vi
			.fn()
			.mockResolvedValueOnce(creds({ token: 'old', expiresAt: now + 10_000 }))
			.mockResolvedValueOnce(creds({ token: 'new', expiresAt: now + 3_600_000 }));
		const cache = new AdminTokenCache({ authenticate, now: () => now, refreshMarginMs: 1_000 });

		expect((await cache.getToken()).token).toBe('old');
		now += 60_000; // past expiry
		expect((await cache.getToken()).token).toBe('new');
		expect(authenticate).toHaveBeenCalledTimes(2);
	});

	it('refreshes ahead of expiry inside the margin', async () => {
		const now = 1_000_000;
		const authenticate = vi
			.fn()
			.mockResolvedValueOnce(creds({ token: 'old', expiresAt: now + 30_000 }))
			.mockResolvedValueOnce(creds({ token: 'new', expiresAt: now + 3_600_000 }));
		const cache = new AdminTokenCache({ authenticate, now: () => now, refreshMarginMs: 60_000 });

		expect((await cache.getToken()).token).toBe('old');
		expect((await cache.getToken()).token).toBe('new');
		expect(authenticate).toHaveBeenCalledTimes(2);
	});

	it('recovers via invalidate after a 401', async () => {
		const authenticate = vi
			.fn()
			.mockResolvedValueOnce(creds({ token: 'stale' }))
			.mockResolvedValueOnce(creds({ token: 'fresh' }));
		const cache = new AdminTokenCache({ authenticate });

		expect((await cache.getToken()).token).toBe('stale');
		cache.invalidate();
		expect((await cache.getToken()).token).toBe('fresh');
		expect(authenticate).toHaveBeenCalledTimes(2);
	});

	it('shares one authenticate round-trip across concurrent callers', async () => {
		let release!: (c: AdminCredentials) => void;
		const gate = new Promise<AdminCredentials>((resolve) => {
			release = resolve;
		});
		const authenticate = vi.fn().mockReturnValue(gate);
		const cache = new AdminTokenCache({ authenticate });

		const pending = Promise.all([cache.getToken(), cache.getToken(), cache.getToken()]);
		release(creds({ token: 'shared' }));
		const results = await pending;

		expect(results.map((r) => r.token)).toEqual(['shared', 'shared', 'shared']);
		expect(authenticate).toHaveBeenCalledTimes(1);
	});

	it('propagates auth failure and retries on the next call', async () => {
		const authenticate = vi
			.fn()
			.mockRejectedValueOnce(new Error('bad credentials'))
			.mockResolvedValueOnce(creds({ token: 'recovered' }));
		const cache = new AdminTokenCache({ authenticate });

		await expect(cache.getToken()).rejects.toThrow('bad credentials');
		expect((await cache.getToken()).token).toBe('recovered');
		expect(authenticate).toHaveBeenCalledTimes(2);
	});

	it('reads exp from a JWT and rejects malformed tokens', () => {
		expect(getJwtExpiryMs(jwt(1_700_000_000))).toBe(1_700_000_000_000);
		expect(getJwtExpiryMs('not-a-jwt')).toBeNull();
		expect(getJwtExpiryMs('h.bm9uLWpzb24.s')).toBeNull();
	});
});
