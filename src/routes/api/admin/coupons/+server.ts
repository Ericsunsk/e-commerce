import { json } from '@sveltejs/kit';
import { createAdminCoupon } from '$domains/checkout/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const POST = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		const coupon = await createAdminCoupon(body);
		return json({ success: true, coupon }, { status: 201 });
	},
	{ admin: true }
);
