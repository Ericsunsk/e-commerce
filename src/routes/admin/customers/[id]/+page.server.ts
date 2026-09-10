import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminCustomerById } from '$domains/customer/server';

export const load: PageServerLoad = async ({ params }) => {
	const customer = await getAdminCustomerById(params.id);
	if (!customer) {
		throw error(404, '客户不存在');
	}
	return { customer };
};
