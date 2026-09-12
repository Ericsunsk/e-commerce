/**
 * A minimal keyed lock for domain-layer tests.
 *
 * The domain layer takes its lock as an injected `LockFn` (see
 * `catalog/domain/inventory-allocation.ts`), which is what keeps `domain/`
 * testable with no server harness. Domain tests therefore must NOT import the
 * real `$shared/infrastructure/server/locks.server` — doing so breaks domain
 * purity (Constitution Principle IX) for a dependency the code under test
 * never actually needs.
 *
 * This is behaviourally equivalent to the real lock for test purposes: tasks
 * sharing a key run in sequence, tasks with different keys run concurrently.
 */
const chains = new Map<string, Promise<void>>();

export function withTestKeyedLock<T>(key: string, task: () => Promise<T>): Promise<T> {
	const previous = chains.get(key) ?? Promise.resolve();
	const next = previous.then(task, task);
	chains.set(
		key,
		next.then(
			() => undefined,
			() => undefined
		)
	);
	return next;
}
