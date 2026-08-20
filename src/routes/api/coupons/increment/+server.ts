import { json, type RequestHandler } from '@sveltejs/kit';
import { Collections } from '$lib/pocketbase-types';
import { apiHandler } from '$lib/server/api-handler';
import { getCouponStateIssue, normalizeCouponCode } from '$lib/server/coupons';
import { withKeyedLock } from '$lib/server/locks';
import { assertN8nWebhookAuthorized } from '$lib/server/n8n-webhook';
import { createAdminClient } from '$lib/server/pocketbase';
import {
	parseAndNormalizeJsonBody,
	readOptionalTrimmedString,
	readRequiredTrimmedString,
	requireObjectBody
} from '$lib/server/request-body';

interface IncrementRequest {
	couponCode: string;
	orderId?: string;
}

interface IncrementResult {
	success: boolean;
	couponId?: string;
	couponCode: string;
	previousUsage: number;
	newUsage: number;
	usageLimit: number | null;
	error?: string;
	limitReached?: boolean;
}

function normalizeRequestBody(input: unknown): IncrementRequest {
	const data = requireObjectBody(input) as Partial<IncrementRequest>;
	const couponCode = normalizeCouponCode(
		readRequiredTrimmedString(data.couponCode, 'Missing couponCode')
	);
	const orderId = readOptionalTrimmedString(data.orderId);

	return {
		couponCode,
		orderId
	};
}

export const POST: RequestHandler = apiHandler(async ({ request }) => {
	assertN8nWebhookAuthorized(request);
	const payload = await parseAndNormalizeJsonBody(request, normalizeRequestBody);

	const pb = await createAdminClient();
	const result: IncrementResult = {
		success: false,
		couponCode: payload.couponCode,
		previousUsage: 0,
		newUsage: 0,
		usageLimit: null
	};

	let statusCode = 200;

	await withKeyedLock(`coupon:${payload.couponCode}`, async () => {
		const coupons = await pb.collection(Collections.Coupons).getFullList({
			filter: `code="${payload.couponCode}"`
		});

		if (coupons.length === 0) {
			statusCode = 404;
			result.error = 'Coupon not found';
			return;
		}

		const coupon = coupons[0];
		result.couponId = coupon.id;
		result.previousUsage = Number(coupon.usage_count) || 0;
		result.usageLimit = coupon.usage_limit != null ? Number(coupon.usage_limit) : null;

		const issue = getCouponStateIssue(coupon);
		if (issue) {
			if (issue === 'inactive') {
				statusCode = 400;
				result.error = 'Coupon is not active';
			} else if (issue === 'expired') {
				statusCode = 400;
				result.error = 'Coupon has expired';
			} else if (issue === 'limit_reached') {
				result.error = 'Coupon usage limit reached';
				result.limitReached = true;
				result.newUsage = result.previousUsage;
			}
			return;
		}

		const newUsage = result.previousUsage + 1;
		await pb.collection(Collections.Coupons).update(coupon.id, {
			usage_count: newUsage
		});

		result.newUsage = newUsage;
		result.success = true;
	});

	if (statusCode !== 200) {
		return json(result, { status: statusCode });
	}

	return {
		...result,
		processedAt: new Date().toISOString()
	};
});
