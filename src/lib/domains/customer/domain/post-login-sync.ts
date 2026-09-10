/**
 * Post-login sync bus (pure, dependency-free leaf).
 *
 * Lets domain state modules (cart, wishlist) run one-off reconciliation
 * after authentication without importing the auth store — avoiding a
 * customer ↔ cart import cycle. AuthState emits; states register.
 */

export type PostLoginTask = () => void | Promise<void>;

const tasks = new Set<PostLoginTask>();

/** Register a task; returns an unsubscribe function. */
export function registerPostLoginTask(task: PostLoginTask): () => void {
	tasks.add(task);
	return () => {
		tasks.delete(task);
	};
}

/** Run all registered tasks sequentially; one failure never blocks the rest. */
export async function runPostLoginTasks(): Promise<void> {
	for (const task of [...tasks]) {
		try {
			await task();
		} catch (err: unknown) {
			console.error(
				'[post-login-sync] task failed:',
				err instanceof Error ? err.message : String(err)
			);
		}
	}
}

/** Test-only: drop all registrations to isolate test cases. */
export function clearPostLoginTasks(): void {
	tasks.clear();
}
