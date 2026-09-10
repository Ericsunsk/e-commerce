import type { PageServerLoad } from './$types';
import { listAdminNav } from '$domains/content/server';

export const load: PageServerLoad = async () => {
	return { items: await listAdminNav() };
};
