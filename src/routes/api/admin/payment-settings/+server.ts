import type { RequestHandler } from './$types';
import {
	getMaskedPaymentSettings,
	savePaymentSettings,
	invalidateStripeClient
} from '$domains/payment/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET: RequestHandler = apiHandler(
	async () => {
		return { success: true, settings: await getMaskedPaymentSettings() };
	},
	{ admin: true }
);

export const PUT: RequestHandler = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		const settings = await savePaymentSettings(body);
		// Hot-rotate the Stripe client so follow-up requests use the new keys.
		invalidateStripeClient();
		return { success: true, settings };
	},
	{ admin: true }
);
