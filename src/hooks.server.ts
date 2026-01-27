import { type Handle, error } from '@sveltejs/kit';
import { checkoutLimiter, apiLimiter } from '$lib/server/limiter';

export const handle: Handle = async ({ event, resolve }) => {
    const { url, request } = event;

    // 1. Strict Limiter for Checkout & Payment endpoints
    // Only apply to mutation requests (POST, PUT, PATCH, DELETE) or sensitive GETs if needed
    if (request.method === 'POST' && (
        url.pathname.startsWith('/api/checkout') ||
        url.pathname.startsWith('/api/payment-intent') ||
        url.pathname === '/checkout'
    )) {
        if (await checkoutLimiter.isLimited(event)) {
            // Return 429 Too Many Requests
            return new Response('Too many requests. Please try again later.', { 
                status: 429,
                headers: { 'Retry-After': '60' }
            });
        }
    }

    // 2. Moderate Limiter for other API endpoints
    if (url.pathname.startsWith('/api/')) {
        // Skip webhook endpoint from rate limiting (Stripe calls this)
        if (!url.pathname.startsWith('/api/webhooks')) {
            if (await apiLimiter.isLimited(event)) {
                 return new Response('API rate limit exceeded.', { 
                    status: 429,
                    headers: { 'Retry-After': '60' }
                });
            }
        }
    }

    const response = await resolve(event);
    return response;
};
