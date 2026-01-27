import { RateLimiter } from 'sveltekit-rate-limiter/server';

// 1. Checkout/Payment Limiter (Strict)
// Limit: 5 requests per minute per IP
export const checkoutLimiter = new RateLimiter({
    IP: [5, 'm'], // 5 requests per minute
    IPUA: [5, 'm'], // Fallback/Secondary check
});

// 2. General API Limiter (Moderate)
// Limit: 60 requests per minute per IP
export const apiLimiter = new RateLimiter({
    IP: [60, 'm'],
});
