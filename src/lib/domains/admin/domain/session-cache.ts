/**
 * Admin session token cache (pure, framework-free).
 *
 * Validated superuser tokens are cached briefly so every admin request does
 * not pay a PocketBase `authRefresh` round-trip. The cache is BOUNDED: expired
 * entries are evicted on read, and the map evicts its oldest entry once
 * `maxEntries` is exceeded, so a long-running process cannot grow unbounded.
 */

export interface CachedSession {
	email: string;
	/** Epoch milliseconds after which the entry is stale. */
	expiresAt: number;
}

export interface SessionCacheDeps {
	now?: () => number;
	/** Entries kept before the oldest is evicted (default 500). */
	maxEntries?: number;
}

export class AdminSessionCache {
	private readonly entries = new Map<string, CachedSession>();
	private readonly now: () => number;
	private readonly maxEntries: number;

	constructor(deps: SessionCacheDeps = {}) {
		this.now = deps.now ?? Date.now;
		this.maxEntries = deps.maxEntries ?? 500;
	}

	/** Cached email for a live token, or null when absent/expired. */
	get(token: string): string | null {
		const entry = this.entries.get(token);
		if (!entry) return null;

		// Drop stale entries instead of leaving them to accumulate.
		if (entry.expiresAt <= this.now()) {
			this.entries.delete(token);
			return null;
		}
		return entry.email;
	}

	/** Store a token, evicting the oldest entry when at capacity. */
	set(token: string, email: string, ttlMs: number): void {
		// Re-insert so the eviction order reflects recency of use.
		this.entries.delete(token);

		if (this.entries.size >= this.maxEntries) {
			const oldest = this.entries.keys().next();
			if (!oldest.done) this.entries.delete(oldest.value);
		}

		this.entries.set(token, { email, expiresAt: this.now() + ttlMs });
	}

	/** Forget a token (failed validation, logout, or credential rotation). */
	delete(token: string): void {
		this.entries.delete(token);
	}

	/** Current entry count (test/diagnostics). */
	get size(): number {
		return this.entries.size;
	}
}
