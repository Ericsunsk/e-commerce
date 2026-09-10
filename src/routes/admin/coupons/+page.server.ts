import type { PageServerLoad } from './$types';
import { listAdminCoupons } from '$domains/checkout/server';

export const load: PageServerLoad = async () => {
	return { coupons: await listAdminCoupons() };
};
