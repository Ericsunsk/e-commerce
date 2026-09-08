import { error, json, type RequestEvent } from '@sveltejs/kit';

type ApiHandler<T = unknown> = (event: RequestEvent) => Promise<T>;

interface ApiHandlerOptions {
	auth?: boolean;
}

export function apiHandler(handler: ApiHandler, options: ApiHandlerOptions = {}) {
	return async (event: RequestEvent) => {
		try {
			if (options.auth && !event.locals.user) {
				throw error(401, 'Unauthorized');
			}

			const result = await handler(event);

			if (result instanceof Response) return result;

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

			if (status >= 500) {
				console.error('API Handler Error:', err);
			}

			return json({ error: message }, { status });
		}
	};
}
