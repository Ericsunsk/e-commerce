import { pb, createAdminClient, invalidateAdminTokenCache } from './pocketbase.server';
import { getErrorStatus } from './pocketbase-json.server';
import { isRedirect, isHttpError } from '@sveltejs/kit';

type AdminOperation<T> = (pbInstance: typeof pb) => Promise<T>;

/**
 * Execute a server-side operation with Admin privileges.
 *
 * On a 401 the cached admin token is assumed stale: it is invalidated and
 * the operation is retried once with a freshly authenticated client.
 */
export async function withAdmin<T>(operation: AdminOperation<T>, fallbackValue?: T): Promise<T> {
	try {
		const adminPb = await createAdminClient();
		return await operation(adminPb ?? pb);
	} catch (e: unknown) {
		if (isRedirect(e) || isHttpError(e)) {
			throw e;
		}

		if (getErrorStatus(e) === 401) {
			invalidateAdminTokenCache();
			try {
				const adminPb = await createAdminClient();
				return await operation(adminPb ?? pb);
			} catch (retryError: unknown) {
				if (isRedirect(retryError) || isHttpError(retryError)) {
					throw retryError;
				}
				return handleAdminError(operation, retryError, fallbackValue);
			}
		}

		return handleAdminError(operation, e, fallbackValue);
	}
}

function handleAdminError<T>(
	operation: AdminOperation<T>,
	e: unknown,
	fallbackValue?: T
): Promise<T> {
	const context = operation.name ? `[${operation.name}]` : '[AdminOp]';
	const message = e instanceof Error ? e.message : String(e);
	console.error(`${context} failed:`, message);
	const responseData = (e as { response?: { data?: unknown } }).response?.data;
	if (responseData) {
		console.error(`${context} PocketBase details:`, JSON.stringify(responseData, null, 2));
	}

	if (fallbackValue !== undefined) {
		return Promise.resolve(fallbackValue);
	}

	throw e;
}
