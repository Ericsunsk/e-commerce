import { testStripeConnection } from '$domains/payment/server';
import { apiHandler } from '$shared/infrastructure/server';

/** Verify a secret key against the live Stripe API (never persists). */
export const POST = apiHandler(
	async ({ request }) => {
		// An empty or unparseable body is meaningful here: it means "test the
		// stored key", so unlike the CRUD endpoints we must not 400 on it.
		let body: Record<string, unknown> = {};
		try {
			body = await request.json();
		} catch {
			// Empty body → test the stored/effective key.
		}

		const candidate = typeof body.secretKey === 'string' ? body.secretKey : undefined;
		const result = await testStripeConnection(candidate);
		return { success: true, ...result };
	},
	{ admin: true }
);
