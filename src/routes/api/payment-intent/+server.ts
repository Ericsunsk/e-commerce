import { json } from '@sveltejs/kit';
import { apiHandler, intakeLimiter } from '$shared/infrastructure/server';
import { handlePaymentIntentRequest } from '$domains/checkout/server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = apiHandler(async (event) => {
	// This endpoint is intentionally reachable without an account (guest
	// checkout), but each call can create a Stripe Customer and burn a Stripe
	// Tax lookup. Apply the strict limiter here, where the event is available.
	if (await intakeLimiter.isLimited(event)) {
		return json({ error: 'Too many checkout attempts. Please try again later.' }, { status: 429 });
	}

	return handlePaymentIntentRequest(event.request);
});
