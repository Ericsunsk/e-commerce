import { pb, createAdminClient } from './pocketbase.server';
import { isRedirect, isHttpError } from '@sveltejs/kit';

type AdminOperation<T> = (pbInstance: typeof pb) => Promise<T>;

/**
 * Execute a server-side operation with Admin privileges.
 */
export async function withAdmin<T>(operation: AdminOperation<T>, fallbackValue?: T): Promise<T> {
	try {
		const adminPb = await createAdminClient();
		return await operation(adminPb ?? pb);
	} catch (e: unknown) {
		if (isRedirect(e) || isHttpError(e)) {
			throw e;
		}

		const context = operation.name ? `[${operation.name}]` : '[AdminOp]';
		const message = e instanceof Error ? e.message : String(e);
		console.error(`${context} failed:`, message);
		const responseData = (e as { response?: { data?: unknown } }).response?.data;
		if (responseData) {
			console.error(`${context} PocketBase details:`, JSON.stringify(responseData, null, 2));
		}

		if (fallbackValue !== undefined) {
			return fallbackValue;
		}

		throw e;
	}
}
