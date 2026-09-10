import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async () => {
	return {
		pocketbaseUrl: env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090',
		cdnConfigured: Boolean(env.PUBLIC_R2_CDN_URL),
		stripePublishableConfigured: Boolean(env.PUBLIC_STRIPE_KEY)
	};
};
