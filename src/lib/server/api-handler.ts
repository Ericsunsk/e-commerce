import { error, json, type RequestEvent } from '@sveltejs/kit';

type ApiHandler<T = any> = (event: RequestEvent) => Promise<T>;

interface ApiHandlerOptions {
    auth?: boolean; // If true, requires locals.user
}

export function apiHandler(handler: ApiHandler, options: ApiHandlerOptions = {}) {
    return async (event: RequestEvent) => {
        try {
            if (options.auth && !event.locals.user) {
                throw error(401, 'Unauthorized');
            }

            // Execute handler
            const result = await handler(event);
            
            // If result is already a Response object (e.g. redirect or custom response), return it
            if (result instanceof Response) return result;

            // Otherwise, wrap in json()
            // If result is null/undefined, return empty json or null? 
            // json(undefined) is technically valid (void response body?)
            return json(result ?? {});

        } catch (err: any) {
            // Check if it's a SvelteKit error (thrown by error())
            // SvelteKit errors look like { status: number, body: { message: string } }
            // But 'error' function throws an HttpError object.
            
            const status = err.status || 500;
            const message = err.body?.message || err.message || 'Internal Server Error';
            
            // Only log 500s or unexpected errors
            if (status >= 500) {
                console.error('API Handler Error:', err);
            }

            return json({ error: message }, { status });
        }
    };
}
