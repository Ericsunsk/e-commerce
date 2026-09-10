import { Collections, type TypedPocketBase } from '$shared/infrastructure';
import { withAdmin, getErrorStatus, withKeyedLock, buildPocketBaseFilter } from '$shared/infrastructure/server';
import {
	normalizeCouponCode,
	getCouponStateIssue,
	calculateCouponDiscount,
	type Coupon,
	type CouponValidationResult
} from '../domain/models';

export async function validateAndApplyCouponWithClient(
	pb: TypedPocketBase,
	code: string,
	amountCents: number
): Promise<CouponValidationResult> {
	if (!code) {
		return { valid: false, discountCents: 0, error: 'Coupon code is required' };
	}

	const normalizedCode = normalizeCouponCode(code);

	let coupon: Coupon;
	try {
		const filter = buildPocketBaseFilter(pb, 'code = {:code}', { code: normalizedCode });

		coupon = await pb.collection(Collections.Coupons).getFirstListItem<Coupon>(filter);
	} catch (err: unknown) {
		if (getErrorStatus(err) === 404) {
			return { valid: false, discountCents: 0, error: 'Invalid coupon code' };
		}
		throw err;
	}

	const stateIssue = getCouponStateIssue(coupon);
	if (stateIssue) {
		if (stateIssue === 'inactive') {
			return { valid: false, discountCents: 0, error: 'Invalid or inactive coupon' };
		}
		if (stateIssue === 'expired') {
			return { valid: false, discountCents: 0, error: 'Coupon has expired' };
		}
		return { valid: false, discountCents: 0, error: 'Coupon usage limit reached' };
	}

	const amountDollars = amountCents / 100;
	if (coupon.min_order_amount && amountDollars < coupon.min_order_amount) {
		return {
			valid: false,
			discountCents: 0,
			error: `Minimum order amount of $${coupon.min_order_amount} required`
		};
	}

	const discountCents = calculateCouponDiscount(coupon, amountCents);

	return {
		valid: true,
		coupon,
		discountCents
	};
}

export async function validateAndApplyCoupon(
	code: string,
	amountCents: number
): Promise<CouponValidationResult> {
	if (!code) {
		return { valid: false, discountCents: 0, error: 'Coupon code is required' };
	}

	const fallback: CouponValidationResult = {
		valid: false,
		discountCents: 0,
		error: 'Failed to verify coupon'
	};

	return withAdmin((pb) => validateAndApplyCouponWithClient(pb, code, amountCents), fallback);
}

export async function incrementCouponUsage(couponId: string): Promise<void> {
	try {
		await withAdmin(async (pb) => {
			const coupon = await pb.collection(Collections.Coupons).getOne<Coupon>(couponId);

			if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
				console.warn(`⚠️ Coupon ${couponId} usage limit exceeded during increment.`);
				return;
			}

			await pb.collection(Collections.Coupons).update(couponId, {
				usage_count: (coupon.usage_count ?? 0) + 1
			});
		});
	} catch (err) {
		console.error('Failed to increment coupon usage:', err);
	}
}

/**
 * Atomically increment coupon usage by code (webhook pipeline). Resolves
 * the coupon under a per-code lock so concurrent fulfillments never
 * double-count; missing coupons are a no-op.
 */
export async function incrementCouponUsageByCodeWithClient(
	pb: TypedPocketBase,
	couponCode: string
): Promise<void> {
	const normalizedCode = normalizeCouponCode(couponCode);
	await withKeyedLock(`coupon:${normalizedCode}`, async () => {
		let coupon: Coupon;
		try {
			const filter = buildPocketBaseFilter(pb, 'code = {:code}', { code: normalizedCode });
			coupon = await pb.collection(Collections.Coupons).getFirstListItem<Coupon>(filter);
		} catch (err: unknown) {
			if (getErrorStatus(err) === 404) return;
			throw err;
		}

		const stateIssue = getCouponStateIssue(coupon);
		if (stateIssue === 'inactive') {
			console.warn(`⚠️ Coupon ${normalizedCode} is inactive; usage not incremented.`);
			return;
		}
		if (stateIssue === 'expired') {
			console.warn(`⚠️ Coupon ${normalizedCode} has expired; usage not incremented.`);
			return;
		}
		if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
			console.warn(`⚠️ Coupon ${normalizedCode} usage limit exceeded during increment.`);
			return;
		}
		await pb.collection(Collections.Coupons).update(coupon.id, {
			usage_count: (coupon.usage_count ?? 0) + 1
		});
	});
}
