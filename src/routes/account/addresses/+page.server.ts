import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Address data is loaded client-side after auth verification
	return {};
};
