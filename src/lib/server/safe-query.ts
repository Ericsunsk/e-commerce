import { isRedirect, isHttpError } from '@sveltejs/kit';

/**
 * Execute a server-side query safely, handling errors and redirects.
 *
 * @param fn The async operation to execute
 * @param fallback The value to return if an error occurs (that isn't a redirect/http error)
 * @param contextMessage Optional message to log with the error
 */
export async function safeQuery<T>(
	fn: () => Promise<T>,
	fallback: T,
	contextMessage: string = 'Query failed'
): Promise<T> {
	try {
		return await fn();
	} catch (e: unknown) {
		// Always re-throw SvelteKit control flow exceptions
		if (isRedirect(e) || isHttpError(e)) {
			throw e;
		}

		// Log actual runtime errors
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.warn(`[SafeQuery] ${contextMessage}:`, errorMessage);

		// Return fallback
		return fallback;
	}
}
