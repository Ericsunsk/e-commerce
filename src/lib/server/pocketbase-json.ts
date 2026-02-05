function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function getErrorStatus(err: unknown): number | undefined {
	if (!isObject(err)) return undefined;
	if (!('status' in err)) return undefined;
	const status = err.status;
	return typeof status === 'number' ? status : undefined;
}

/**
 * PocketBase JSON fields can be sensitive to `undefined` values.
 * This helper removes `undefined` by round-tripping through JSON.
 */
export function sanitizePocketBaseJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
