/**
 * Admin token cache (pure, framework-free).
 *
 * Caches the PocketBase superuser auth token in memory so concurrent
 * `withAdmin` calls reuse it instead of re-authenticating (and re-running
 * bcrypt) on every server operation. Refresh is single-flight: parallel
 * callers awaiting an expired token share one authenticate round-trip.
 */

export interface AdminCredentials {
	token: string;
	/** Auth record returned by the login call (opaque to the cache). */
	record: unknown;
	/** Epoch milliseconds after which the token must be refreshed. */
	expiresAt: number;
}

export interface TokenCacheDeps {
	authenticate: () => Promise<AdminCredentials>;
	now?: () => number;
	/** Refresh ahead of expiry by this margin (default 60s). */
	refreshMarginMs?: number;
}

/** Read the `exp` claim (seconds) from a JWT without verifying it. */
export function getJwtExpiryMs(token: string): number | null {
	try {
		const payload = token.split('.')[1];
		if (!payload) return null;
		const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
		if (typeof json.exp === 'number') return json.exp * 1000;
		return null;
	} catch {
		return null;
	}
}

export class AdminTokenCache {
	private cached: AdminCredentials | null = null;
	private inflight: Promise<AdminCredentials> | null = null;
	private readonly now: () => number;
	private readonly marginMs: number;
	private readonly authenticate: () => Promise<AdminCredentials>;

	constructor(deps: TokenCacheDeps) {
		this.authenticate = deps.authenticate;
		this.now = deps.now ?? Date.now;
		this.marginMs = deps.refreshMarginMs ?? 60_000;
	}

	async getToken(): Promise<AdminCredentials> {
		const cached = this.cached;
		if (cached && cached.expiresAt - this.marginMs > this.now()) {
			return cached;
		}
		if (!this.inflight) {
			this.inflight = this.authenticate().then((creds) => {
				this.cached = creds;
				return creds;
			});
		}
		try {
			return await this.inflight;
		} finally {
			this.inflight = null;
		}
	}

	/** Drop the cached token so the next call re-authenticates (e.g. after a 401). */
	invalidate(): void {
		this.cached = null;
	}
}
