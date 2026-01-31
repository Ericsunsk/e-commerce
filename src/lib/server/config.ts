// Stripe Configuration
export const STRIPE_CONFIG = {
	// These defaults are safe to use if env vars are missing during build/dev without .env
	// BUT the app will throw error at runtime if keys are missing (enforced in stripe.ts)
	SECRET_KEY_ENV_NAME: 'STRIPE_SECRET_KEY',
	WEBHOOK_SECRET_ENV_NAME: 'STRIPE_WEBHOOK_SECRET',

	// Checkout specific config
	CURRENCY: 'usd',
	ALLOWED_COUNTRIES: ['US', 'CA', 'GB'] as const,
	PAYMENT_METHOD_TYPES: ['card'] as const
};
