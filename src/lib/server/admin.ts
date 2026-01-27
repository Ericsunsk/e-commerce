import { pb, initAdmin } from '$lib/server/pocketbase';
import { isRedirect, isHttpError } from '@sveltejs/kit';

type AdminOperation<T> = (pbInstance: typeof pb) => Promise<T>;

/**
 * Execute a server-side operation with Admin privileges.
 * 
 * @param operation The async function to execute with authenticated admin client
 * @param fallbackValue Optional value to return in case of error. If provided, errors are logged and swallowed.
 * @returns The result of operation or fallbackValue
 */
export async function withAdmin<T>(
    operation: AdminOperation<T>, 
    fallbackValue?: T
): Promise<T> {
    try {
        await initAdmin();
        return await operation(pb);
    } catch (e: any) {
        // Always re-throw SvelteKit control flow exceptions
        if (isRedirect(e) || isHttpError(e)) {
            throw e;
        }

        // Log detailed error for debugging
        const context = operation.name ? `[${operation.name}]` : '[AdminOp]';
        console.error(`${context} failed:`, e?.message || e);
        
        // If fallback is provided (even if null), return it
        if (fallbackValue !== undefined) {
            return fallbackValue;
        }
        
        throw e;
    }
}
