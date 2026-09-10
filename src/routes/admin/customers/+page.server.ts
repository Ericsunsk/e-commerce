import type { PageServerLoad } from './$types';
import { listAdminCustomers } from '$domains/customer/server';

export const load: PageServerLoad = async ({ url }) => {
	const result = await listAdminCustomers(
		url.searchParams.get('q') ?? '',
		Number(url.searchParams.get('page') ?? 1)
	);
	return { ...result, q: url.searchParams.get('q') ?? '' };
};
