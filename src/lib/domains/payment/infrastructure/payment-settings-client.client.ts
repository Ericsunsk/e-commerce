/**
 * Payment settings HTTP client (browser-side).
 *
 * Replaces the hand-rolled `fetch` + `res.ok` + `body.error` sequences in the
 * admin settings page. See the platform equivalent for the rationale.
 *
 * The view type is the domain's own `MaskedPaymentSettings`, so a change to
 * what the API masks shows up here as a type error rather than a silent
 * `undefined` in the form.
 */

import { apiClient } from '$shared/infrastructure';
import type { ConnectionTestResult, MaskedPaymentSettings } from '../domain/payment-settings';

export type PaymentSettingsView = MaskedPaymentSettings;

export async function fetchPaymentSettings(): Promise<PaymentSettingsView> {
	const data = await apiClient<{ settings: PaymentSettingsView }>('/api/admin/payment-settings');
	return data.settings;
}

export async function savePaymentSettings(payload: {
	publishableKey?: string;
	secretKey?: string;
	webhookSecret?: string;
}): Promise<PaymentSettingsView> {
	const data = await apiClient<{ settings: PaymentSettingsView }>('/api/admin/payment-settings', {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
	return data.settings;
}

/**
 * The endpoint returns `apiHandler`'s `success: true` spread over the domain's
 * `ConnectionTestResult` ({ ok, accountId, message }), so both are on the wire.
 */
export type StripeTestResult = ConnectionTestResult & { success: boolean };

/**
 * Verify a secret key against Stripe.
 *
 * An empty body is meaningful and preserved: it means "test the stored key"
 * rather than "test this candidate". Passing `{}` is therefore different from
 * omitting the call.
 */
export async function testStripeConnection(secretKey?: string): Promise<StripeTestResult> {
	return apiClient<StripeTestResult>('/api/admin/payment/test', {
		method: 'POST',
		body: JSON.stringify(secretKey ? { secretKey } : {})
	});
}
