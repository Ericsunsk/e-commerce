import { apiHandler } from '$shared/infrastructure/server';
import { handlePaymentIntentRequest } from '$domains/checkout/server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = apiHandler(async ({ request }) =>
	handlePaymentIntentRequest(request)
);
