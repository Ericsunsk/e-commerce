const lockChains = new Map<string, Promise<void>>();

export async function withKeyedLock<T>(key: string, task: () => Promise<T>): Promise<T> {
	const previous = lockChains.get(key) ?? Promise.resolve();

	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});

	const current = previous.then(() => gate);
	lockChains.set(key, current);

	await previous;

	try {
		return await task();
	} finally {
		release();
		if (lockChains.get(key) === current) {
			lockChains.delete(key);
		}
	}
}
