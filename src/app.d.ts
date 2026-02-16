import type { TypedPocketBase, UsersResponse } from '$lib/pocketbase-types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			pb: TypedPocketBase;
			user: UsersResponse | null;
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
