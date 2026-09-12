import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Application-layer tests for the Stripe webhook pipeline.
 *
 * The *domain* half of this pipeline (`classifyStripeEvent`,
 * `fulfillSucceededPayment`) is already covered in
 * `order/domain/stripe-webhook.test.ts`, including retry and concurrency
 * behaviour. What was untested is the orchestration this file adds:
 *
 *   - `verifyStripeWebhook`'s error branching — three distinct failures (
 *     missing header / missing secret / bad signature) that map to three
 *     different HTTP statuses, one of which is a misconfiguration rather than
 *     a client error.
 *   - `handleStripeWebhookEvent`'s dispatch — which event kinds are handled,
 *     which are ignored, and what `handled`/`outcome` come back as.
 *
 * Both are thin on logic but load-bearing: a wrong status here means Stripe
 * retries forever, or an operator cannot tell a bad signature from a
 * misconfigured secret.
 */

// vi.mock is hoisted above the imports, so the factory cannot close over
// ordinary top-level bindings — vi.hoisted() creates them in the same phase.
const mocks = vi.hoisted(() => ({
	getPaymentConfig: vi.fn(),
	getStripeClient: vi.fn()
}));
const { getPaymentConfig, getStripeClient } = mocks;

vi.mock('$domains/payment/server', () => ({
	getPaymentConfig: mocks.getPaymentConfig,
	getStripeClient: mocks.getStripeClient
}));

vi.mock('$domains/catalog/server', () => ({
	createInventoryAllocator: () => ({
		allocate: vi.fn().mockResolvedValue({ success: true })
	})
}));

vi.mock('$domains/checkout/server', () => ({
	incrementCouponUsageByCodeWithClient: vi.fn().mockResolvedValue(undefined)
}));

/**
 * Stubbed wholesale rather than partially: the real barrel instantiates a
 * `RateLimiter` at module scope which requires hash configuration, and none of
 * it is relevant to webhook dispatch.
 */
vi.mock('$shared/infrastructure/server', () => ({
	withAdmin: (fn: (pb: unknown) => Promise<unknown>) => fn(fakePb()),
	withKeyedLock: (_key: string, fn: () => Promise<unknown>) => fn(),
	getErrorStatus: (err: unknown) =>
		typeof err === 'object' && err !== null && 'status' in err
			? (err as { status: number }).status
			: undefined
}));

const { fakePb } = vi.hoisted(() => ({
	fakePb: () => ({
		collection: () => ({
			getFirstListItem: vi.fn().mockRejectedValue({ status: 404 }),
			findFirstListItem: vi.fn().mockRejectedValue({ status: 404 }),
			create: vi.fn().mockResolvedValue({ id: 'rec_1' }),
			update: vi.fn().mockResolvedValue({ id: 'rec_1' }),
			delete: vi.fn().mockResolvedValue(undefined),
			getFullList: vi.fn().mockResolvedValue([])
		})
	})
}));

const { verifyStripeWebhook, handleStripeWebhookEvent } = await import('./stripe-webhook.server');

beforeEach(() => {
	getPaymentConfig.mockReset();
	getStripeClient.mockReset();
});

describe('verifyStripeWebhook', () => {
	it('rejects a request with no signature header as 400', async () => {
		await expect(verifyStripeWebhook('{}', null)).rejects.toMatchObject({ status: 400 });
		// Must not reach config or Stripe when the header is absent.
		expect(getPaymentConfig).not.toHaveBeenCalled();
	});

	it('treats a missing webhook secret as 500, not 400', async () => {
		getPaymentConfig.mockResolvedValue({ webhookSecret: '' });

		// 500 is deliberate: this is an operator misconfiguration, not a bad
		// request from Stripe. Returning 400 would tell Stripe to give up, and
		// the failure would look like the caller's fault in the logs.
		await expect(verifyStripeWebhook('{}', 'sig')).rejects.toMatchObject({ status: 500 });
		expect(getStripeClient).not.toHaveBeenCalled();
	});

	it('rejects an invalid signature as 400', async () => {
		getPaymentConfig.mockResolvedValue({ webhookSecret: 'whsec_test' });
		getStripeClient.mockResolvedValue({
			webhooks: {
				constructEvent: () => {
					throw new Error('No signatures found matching the expected signature');
				}
			}
		});

		await expect(verifyStripeWebhook('{}', 'bogus')).rejects.toMatchObject({
			status: 400,
			message: 'Invalid webhook signature'
		});
	});

	it('passes the constructed event through on success', async () => {
		const event = { id: 'evt_1', type: 'payment_intent.succeeded' };
		getPaymentConfig.mockResolvedValue({ webhookSecret: 'whsec_test' });
		const constructEvent = vi.fn().mockReturnValue(event);
		getStripeClient.mockResolvedValue({ webhooks: { constructEvent } });

		await expect(verifyStripeWebhook('{"raw":true}', 'sig')).resolves.toEqual(event);
		// The raw body and the stored secret must be what Stripe verifies against.
		expect(constructEvent).toHaveBeenCalledWith('{"raw":true}', 'sig', 'whsec_test');
	});
});

describe('handleStripeWebhookEvent dispatch', () => {
	it('ignores event kinds it does not act on', async () => {
		const result = await handleStripeWebhookEvent({ type: 'customer.created', data: {} });

		expect(result.handled).toBe(false);
		expect(result.outcome).toBe('ignored');
	});

	it('ignores malformed events without throwing', async () => {
		const result = await handleStripeWebhookEvent(null);

		expect(result.handled).toBe(false);
		expect(result.outcome).toBe('ignored');
	});

	it('marks a payment failure as handled-and-logged', async () => {
		const result = await handleStripeWebhookEvent({
			type: 'payment_intent.payment_failed',
			data: {
				object: {
					id: 'pi_failed',
					last_payment_error: { message: 'card declined' }
				}
			}
		});

		// handled: true so the route returns 200 — a payment failure is a
		// business outcome, not a delivery failure, and must not be retried.
		expect(result.handled).toBe(true);
		expect(result.outcome).toBe('failed-logged');
	});
});
