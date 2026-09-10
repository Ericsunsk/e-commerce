/**
 * Dynamic Stripe client provider (server-only).
 *
 * Replaces the old static `new Stripe(env.STRIPE_SECRET_KEY)` singleton:
 * the secret resolves per call from `payment_settings` (database first,
 * `.env` fallback), Stripe instances are cached by secret, and admin saves
 * rotate the client hot via `invalidateStripeClient()` — no restart.
 */
import Stripe from 'stripe';
import { getPaymentConfig } from './payment-settings.server';

export interface StripeClientDeps {
	getConfig: () => Promise<{ secretKey: string; publishableKey: string }>;
	createClient: (secretKey: string) => Stripe;
}

/** Testable provider core (no PocketBase/env access inside). */
export function createStripeClientProvider(deps: StripeClientDeps) {
	let cached: { secretKey: string; client: Stripe } | null = null;
	let inflight: Promise<Stripe> | null = null;

	async function getClient(): Promise<Stripe> {
		const { secretKey } = await deps.getConfig();
		if (!secretKey) {
			throw new Error('未配置 Stripe 私钥');
		}
		if (cached && cached.secretKey === secretKey) return cached.client;
		if (!inflight) {
			inflight = (async () => {
				const client = deps.createClient(secretKey);
				cached = { secretKey, client };
				return client;
			})();
		}
		try {
			return await inflight;
		} finally {
			inflight = null;
		}
	}

	async function getPublishableKey(): Promise<string> {
		return (await deps.getConfig()).publishableKey;
	}

	function invalidate(): void {
		cached = null;
	}

	return { getClient, getPublishableKey, invalidate };
}

const provider = createStripeClientProvider({
	getConfig: async () => {
		const config = await getPaymentConfig();
		return { secretKey: config.secretKey, publishableKey: config.publishableKey };
	},
	createClient: (secretKey: string) =>
		new Stripe(secretKey, { apiVersion: '2025-02-24.acacia', typescript: true })
});

/** Stripe client for the currently effective secret (cached, hot-rotatable). */
export async function getStripeClient(): Promise<Stripe> {
	return provider.getClient();
}

/** Publishable key currently served to Checkout Elements. */
export async function getPublishableKey(): Promise<string> {
	return provider.getPublishableKey();
}

/** Drop the cached client so the next call picks up rotated keys. */
export function invalidateStripeClient(): void {
	provider.invalidate();
}
