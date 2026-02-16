import { error, json, type RequestEvent } from '@sveltejs/kit';

type ApiHandler<T = unknown> = (event: RequestEvent) => Promise<T>;

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
		} catch (err: unknown) {
			let status = 500;
			let message = 'Internal Server Error';

			if (typeof err === 'object' && err !== null) {
				const e = err as Record<string, unknown>;
				if (typeof e.status === 'number') status = e.status;

				const body = e.body;
				if (typeof body === 'object' && body !== null) {
					const b = body as Record<string, unknown>;
					if (typeof b.message === 'string') message = b.message;
				}

				if (message === 'Internal Server Error' && typeof e.message === 'string') {
					message = e.message;
				}
			}

			if (message === 'Internal Server Error' && err instanceof Error && err.message) {
				message = err.message;
			}

			// Only log 500s or unexpected errors
			if (status >= 500) {
				console.error('API Handler Error:', err);
			}

			return json({ error: message }, { status });
		}
	};
}
