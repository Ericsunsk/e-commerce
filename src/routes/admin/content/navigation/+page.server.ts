import type { PageServerLoad } from './$types';
import { listAdminNav } from '$domains/content/server';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async () => {
	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
	return { items: await listAdminNav(), pocketbaseUrl };
};
