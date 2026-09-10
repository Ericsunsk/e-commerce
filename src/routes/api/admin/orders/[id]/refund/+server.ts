import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { refundAdminOrder } from '$domains/order/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const POST: RequestHandler = async ({ locals, params, request }) => {
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
		const result = await refundAdminOrder(params.id, body);
		return json({
			success: true,
			refund: { id: result.refundId, status: result.status, amountCents: result.amountCents },
			order: { id: result.order.id, status: result.order.status }
		});
	} catch (err: unknown) {
		const status = getErrorStatus(err);
		// Stripe SDK errors carry their own statusCode/message.
		const stripeStatus =
			typeof err === 'object' && err !== null && 'statusCode' in err
				? Number((err as { statusCode: unknown }).statusCode)
				: undefined;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: 'Refund failed';
		if (status === 400 || status === 404 || status === 409) {
			throw error(status, message);
		}
		throw error(stripeStatus === 400 ? 400 : 502, message);
	}
};
