import { error, isHttpError, isRedirect, json, type RequestEvent } from '@sveltejs/kit';

interface ApiHandlerOptions {
	/** Require an authenticated end user. */
	auth?: boolean;
	/**
	 * Require an authenticated admin. Checked in addition to `auth`, so passing
	 * both requires both.
	 */
	admin?: boolean;
}

/**
 * Wrap a route handler with auth, JSON serialization, and uniform error mapping.
 *
 * Generic over the event so a route's own `./$types` `RequestEvent` flows
 * through — without this, `params` widens to `string | undefined` and every
 * `[id]` route needs a manual non-null assertion.
 */
export function apiHandler<TEvent extends RequestEvent = RequestEvent>(
	handler: (event: TEvent) => Promise<unknown>,
	options: ApiHandlerOptions = {}
) {
	return async (event: TEvent) => {
		try {
			if (options.auth && !event.locals.user) {
				throw error(401, 'Unauthorized');
			}
			if (options.admin && !event.locals.admin) {
				throw error(401, '需要管理员登录');
			}

			const result = await handler(event);

			if (result instanceof Response) return result;

			return json(result ?? {});
		} catch (err: unknown) {
			// SvelteKit control-flow throws must pass through untouched. Anything
			// built on `withAdmin` re-throws redirects, and SvelteKit's own
			// `error()`/`redirect()` are not failures — converting them to a 500
			// would silently break auth redirects and intended status codes.
			if (isRedirect(err) || isHttpError(err)) throw err;

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
