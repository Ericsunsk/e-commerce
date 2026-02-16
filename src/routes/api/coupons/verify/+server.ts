/**
 * Coupon Verify API
 * 使用统一的优惠券验证服务
 */

import { validateAndApplyCoupon } from '$lib/server/coupons';

import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/server/api-handler';
import {
	parseAndNormalizeJsonBody,
	readRequiredTrimmedString,
	requireObjectBody,
	throwBadRequest
} from '$lib/server/request-body';

interface VerifyCouponRequest {
	code: string;
	cartTotal: number;
}

function normalizeRequestBody(input: unknown): VerifyCouponRequest {
	const data = requireObjectBody(input) as Partial<VerifyCouponRequest>;
	const code = readRequiredTrimmedString(data.code, 'Coupon code is required');
	const cartTotal = Number(data.cartTotal ?? 0);

	if (!Number.isFinite(cartTotal) || cartTotal < 0) {
		throwBadRequest('Invalid cart total');
	}

	return {
		code,
		cartTotal
	};
}

export const POST: RequestHandler = apiHandler(async ({ request }) => {
	const { code, cartTotal } = await parseAndNormalizeJsonBody(request, normalizeRequestBody);

	// 将美元转换为分进行验证
	const amountCents = Math.round(cartTotal * 100);
	const result = await validateAndApplyCoupon(code, amountCents);

	if (!result.valid) {
		const status = result.error?.includes('Invalid') ? 404 : 400;
		throw { status, message: result.error };
	}

	return {
		success: true,
		coupon: {
			code: result.coupon!.code,
			type: result.coupon!.type,
			value: result.coupon!.value,
			discountAmount: result.discountCents / 100, // 转回美元
			id: result.coupon!.id
		}
	};
});
