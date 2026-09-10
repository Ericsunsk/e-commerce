import type { PageServerLoad } from './$types';
import { getAuthMethodsView } from '$domains/platform/server';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async () => {
	const methods = await getAuthMethodsView();
	const pbUrl = (env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
	return { methods, dashboardUrl: `${pbUrl}/_/` };
};
