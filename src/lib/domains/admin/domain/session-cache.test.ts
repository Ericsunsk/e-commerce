import { describe, it, expect } from 'vitest';
import { AdminSessionCache } from './session-cache';

/** Controllable clock so TTL behaviour is deterministic. */
function createClock(start = 0) {
	let current = start;
	return {
		now: () => current,
		advance: (ms: number) => {
			current += ms;
		}
	};
}

describe('AdminSessionCache', () => {
	it('returns the cached email while the entry is live', () => {
		const clock = createClock();
		const cache = new AdminSessionCache({ now: clock.now });

		cache.set('tok', 'root@x.com', 1000);
		expect(cache.get('tok')).toBe('root@x.com');

		clock.advance(999);
		expect(cache.get('tok')).toBe('root@x.com');
	});

	it('evicts entries on read once expired', () => {
		const clock = createClock();
		const cache = new AdminSessionCache({ now: clock.now });

		cache.set('tok', 'root@x.com', 1000);
		clock.advance(1000);

		expect(cache.get('tok')).toBeNull();
		// The expired entry must be gone, not merely invisible.
		expect(cache.size).toBe(0);
	});

	it('forgets a token on delete (logout)', () => {
		const cache = new AdminSessionCache();
		cache.set('tok', 'root@x.com', 60_000);

		cache.delete('tok');
		expect(cache.get('tok')).toBeNull();
		expect(cache.size).toBe(0);
	});

	it('never grows past maxEntries', () => {
		const cache = new AdminSessionCache({ maxEntries: 3 });

		for (let i = 0; i < 50; i++) {
			cache.set(`tok-${i}`, `admin${i}@x.com`, 60_000);
		}

		expect(cache.size).toBe(3);
		// Newest survive, oldest were evicted.
		expect(cache.get('tok-49')).toBe('admin49@x.com');
		expect(cache.get('tok-0')).toBeNull();
	});

	it('treats a re-set token as most recent for eviction order', () => {
		const cache = new AdminSessionCache({ maxEntries: 2 });

		cache.set('a', 'a@x.com', 60_000);
		cache.set('b', 'b@x.com', 60_000);
		cache.set('a', 'a@x.com', 60_000); // 'a' becomes newest
		cache.set('c', 'c@x.com', 60_000); // must evict 'b'

		expect(cache.get('a')).toBe('a@x.com');
		expect(cache.get('c')).toBe('c@x.com');
		expect(cache.get('b')).toBeNull();
	});

	it('returns null for unknown or empty tokens', () => {
		const cache = new AdminSessionCache();
		expect(cache.get('missing')).toBeNull();
		expect(cache.get('')).toBeNull();
		cache.delete('');
		expect(cache.size).toBe(0);
	});
});
