import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import dotenv from 'dotenv';

// Load .env file manually for CSP configuration
dotenv.config();

// Helper to extract domain from script tag (Basic implementation)
function extractDomain(htmlCode) {
    if (!htmlCode) return null;
    const match = htmlCode.match(/src=["'](https?:\/\/[^"']+)["']/);
    if (match && match[1]) {
        try {
            const url = new URL(match[1]);
            return url.origin;
        } catch (e) {
            return null;
        }
    }
    return null;
}

const analyticsDomain = extractDomain(process.env.PUBLIC_ANALYTICS_CODE);

// Define base CSP sources
const scriptSrc = [
    'self',
    'unsafe-inline',
    'unsafe-eval',
    'https://js.stripe.com',
    'https://*.umami.is', 
    'https://analytics.elementhic.com'
];

const connectSrc = [
    'self', 
    'https://pb.elementhic.com', 
    'https://api.stripe.com',
    'https://*.umami.is',
    'https://analytics.elementhic.com'
];

// Add dynamic analytics domain if found
if (analyticsDomain) {
    if (!scriptSrc.includes(analyticsDomain)) scriptSrc.push(analyticsDomain);
    if (!connectSrc.includes(analyticsDomain)) connectSrc.push(analyticsDomain);
    console.log(`[CSP] Added analytics domain: ${analyticsDomain}`);
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
        prerender: {
            entries: ['*', '/robots.txt', '/sitemap.xml']
        },
        csp: {
            // mode: 'auto', // Commented out to allow 'unsafe-inline' to work for event handlers
            directives: {
                'default-src': ['self'],
                'script-src': scriptSrc,
                'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
                'img-src': [
                    'self', 
                    'data:', 
                    'blob:', 
                    'https://pb.elementhic.com', 
                    'https://img.elementhic.com',
                    'https://*.stripe.com',
                    'https://images.unsplash.com'
                ],
                'font-src': ['self', 'https://fonts.gstatic.com'],
                'connect-src': connectSrc,
                'frame-src': [
                    'self', 
                    'https://js.stripe.com', 
                    'https://hooks.stripe.com'
                ],
                'object-src': ['none'],
                'base-uri': ['self']
            }
        }
	}
};

export default config;
