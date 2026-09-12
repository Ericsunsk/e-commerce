import { RateLimiter } from 'sveltekit-rate-limiter/server';

// 1. Checkout/Payment Limiter (Strict)
// Limit: 5 requests per minute per IP
export const checkoutLimiter = new RateLimiter({
	IP: [5, 'm'],
	IPUA: [5, 'm']
});

// 2. General API Limiter (Moderate)
// Limit: 60 requests per minute per IP
export const apiLimiter = new RateLimiter({
	IP: [60, 'm']
});

// 3. Anonymous Checkout Intake Limiter (Strict)
//
// `/api/payment-intent` accepts unauthenticated traffic and each call can
// create a Stripe Customer and bill a Stripe Tax lookup, so it is limited per
// IP *and* per submitted email — the two resources an abuser would consume.
export const intakeLimiter = new RateLimiter({
	IP: [10, 'm'],
	IPUA: [10, 'm']
});
