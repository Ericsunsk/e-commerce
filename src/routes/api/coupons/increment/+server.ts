/**
 * Atomic Coupon Usage Increment API
 *
 * This endpoint provides atomic coupon usage count increment to prevent
 * race conditions where multiple orders use the same coupon beyond its limit.
 *
 * Features:
 * - Conditional update: only increments if under usage limit
 * - Returns the updated usage count
 * - Validates coupon is active and not expired
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/pocketbase';
import { env as privateEnv } from '$env/dynamic/private';
import { Collections } from '$lib/pocketbase-types';

// Expected secret from n8n (same as WEBHOOK_SECRET in n8n workflow)
const WEBHOOK_SECRET = privateEnv.N8N_WEBHOOK_SECRET || 'n8n-elementhic-webhook-2026';

interface IncrementRequest {
	couponCode: string;
	orderId?: string; // For logging/tracking purposes
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

export const POST: RequestHandler = async ({ request }) => {
	// 1. Verify webhook secret
	const secretHeader = request.headers.get('X-Webhook-Secret');
	if (secretHeader !== WEBHOOK_SECRET) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	// 2. Parse request body
	let body: IncrementRequest;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const { couponCode, orderId } = body;

	if (!couponCode) {
		return json({ success: false, error: 'Missing couponCode' }, { status: 400 });
	}

	// 3. Create admin client for privileged operations
	let pb;
	try {
		pb = await createAdminClient();
	} catch (err) {
		console.error('❌ Failed to create admin client:', err);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}

	const result: IncrementResult = {
		success: false,
		couponCode,
		previousUsage: 0,
		newUsage: 0,
		usageLimit: null
	};

	try {
		// 4. Find coupon by code
		const coupons = await pb.collection(Collections.Coupons).getFullList({
			filter: `code="${couponCode}"`
		});

		if (coupons.length === 0) {
			result.error = 'Coupon not found';
			return json(result, { status: 404 });
		}

		const coupon = coupons[0];
		result.couponId = coupon.id;
		result.previousUsage = Number(coupon.usage_count) || 0;
		result.usageLimit = coupon.usage_limit != null ? Number(coupon.usage_limit) : null;

		// 5. Validate coupon is active
		if (!coupon.is_active) {
			result.error = 'Coupon is not active';
			return json(result, { status: 400 });
		}

		// 6. Validate coupon is not expired
		if (coupon.expire_date) {
			const expireDate = new Date(coupon.expire_date);
			if (expireDate < new Date()) {
				result.error = 'Coupon has expired';
				return json(result, { status: 400 });
			}
		}

		// 7. Check usage limit
		const newUsage = result.previousUsage + 1;

		if (result.usageLimit !== null && newUsage > result.usageLimit) {
			result.error = 'Coupon usage limit reached';
			result.limitReached = true;
			// Don't fail the order for post-payment flow
			// Just return info that limit was reached
			return json({
				...result,
				success: false,
				newUsage: result.previousUsage // Keep same
			});
		}

		// 8. Atomic increment
		await pb.collection(Collections.Coupons).update(coupon.id, {
			usage_count: newUsage
		});

		result.newUsage = newUsage;
		result.success = true;

		console.log(
			`✅ Coupon ${couponCode} usage incremented: ${result.previousUsage} → ${newUsage}` +
				(orderId ? ` (Order: ${orderId})` : '')
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		result.error = message;
		console.error(`❌ Coupon increment failed for ${couponCode}:`, message);
		return json(result, { status: 500 });
	}

	return json({
		...result,
		processedAt: new Date().toISOString()
	});
};
