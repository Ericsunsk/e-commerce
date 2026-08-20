import { getErrorStatus } from '$lib/server/pocketbase-json';

export function throwBadRequest(message: string): never {
	throw { status: 400, message };
}

export function requireObjectBody(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== 'object') {
		throwBadRequest('Invalid JSON body');
	}
	return input as Record<string, unknown>;
}

export function readTrimmedString(input: unknown): string {
	return typeof input === 'string' ? input.trim() : '';
}

export function readRequiredTrimmedString(input: unknown, message: string): string {
	const value = readTrimmedString(input);
	if (!value) {
		throwBadRequest(message);
	}
	return value;
}

export function readOptionalTrimmedString(input: unknown): string | undefined {
	const value = readTrimmedString(input);
	return value || undefined;
}

export async function parseAndNormalizeJsonBody<T>(
	request: Request,
	normalize: (input: unknown) => T
): Promise<T> {
	let rawBody: unknown;
	try {
		rawBody = await request.json();
	} catch {
		throwBadRequest('Invalid JSON body');
	}

	try {
		return normalize(rawBody);
	} catch (error) {
		if (getErrorStatus(error) !== undefined) {
			throw error;
		}
		throwBadRequest('Invalid JSON body');
	}
}
