import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// NOTE: Content-Security-Policy has a single source of truth in
// `src/lib/shared/infrastructure/server/security-headers.server.ts`,
// applied per-request by `src/hooks.server.ts`. Do not reintroduce a
// `kit.csp` block here — SvelteKit would emit a second, conflicting header.

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
		alias: {
			$domains: 'src/lib/domains',
			'$domains/*': 'src/lib/domains/*',
			$shared: 'src/lib/shared',
			'$shared/*': 'src/lib/shared/*'
		},
		prerender: {
			entries: ['*', '/robots.txt', '/sitemap.xml']
		}
	}
};

export default config;
