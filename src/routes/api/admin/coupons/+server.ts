import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminCoupon } from '$domains/checkout/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, '请求格式错误');
	}

	try {
		const coupon = await createAdminCoupon(body);
		return json({ success: true, coupon }, { status: 201 });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '创建优惠券失败';
		throw error(status, message);
	}
};
