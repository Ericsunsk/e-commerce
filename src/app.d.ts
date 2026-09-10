import type { TypedPocketBase, UsersResponse } from '$shared/infrastructure';

declare global {
	namespace App {
		// interface Error {}
		interface Error {
			message: string;
			errorId?: string;
		}
		interface Locals {
			pb: TypedPocketBase;
			user: UsersResponse | null;
			admin: { email: string } | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				STRIPE_SECRET_KEY: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
