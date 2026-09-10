import { describe, it, expect, vi } from 'vitest';
import { registerPostLoginTask, runPostLoginTasks, clearPostLoginTasks } from './post-login-sync';

describe('post-login sync bus', () => {
	it('runs registered tasks in order and supports unsubscribe', async () => {
		clearPostLoginTasks();
		const order: string[] = [];
		const off = registerPostLoginTask(() => {
			order.push('a');
		});
		registerPostLoginTask(async () => {
			order.push('b');
		});

		await runPostLoginTasks();
		expect(order).toEqual(['a', 'b']);

		off();
		await runPostLoginTasks();
		expect(order).toEqual(['a', 'b', 'b']);
		clearPostLoginTasks();
	});

	it('isolates task failures so remaining tasks still run', async () => {
		clearPostLoginTasks();
		const logged: unknown[] = [];
		const orig = console.error;
		console.error = (...args: unknown[]) => {
			logged.push(args);
		};
		const ran = vi.fn();
		try {
			registerPostLoginTask(() => {
				throw new Error('boom');
			});
			registerPostLoginTask(ran);
			await runPostLoginTasks();
		} finally {
			console.error = orig;
			clearPostLoginTasks();
		}
		expect(ran).toHaveBeenCalledTimes(1);
		expect(logged.length).toBeGreaterThan(0);
	});
});
