import type { PageServerLoad } from './$types';
import { reconcileCheckoutOrder } from '$domains/order/server';

/**
 * Self-healing reconciliation: if the order webhook has not recorded the
 * order yet, verify the Stripe PaymentIntent directly and idempotently
 * create the order + deduct inventory. Never blocks the thank-you page.
 */
export const load: PageServerLoad = async ({ url }) => {
	const paymentIntentId = url.searchParams.get('payment_intent');
	if (!paymentIntentId) return { reconciled: null };

	try {
		const reconciled = await reconcileCheckoutOrder(paymentIntentId);
		return { reconciled };
	} catch (err: unknown) {
		console.error(
			'[checkout/success] reconciliation failed:',
			err instanceof Error ? err.message : String(err)
		);
		return { reconciled: null };
	}
};
