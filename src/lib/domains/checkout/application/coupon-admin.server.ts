/**
 * Admin coupon management (server-only).
 *
 * Lists all coupons with redemption stats, creates validated coupons, and
 * toggles `is_active`. Created coupons flow through the same
 * `validateAndApplyCouponWithClient` path as checkout, so they are
 * immediately redeemable.
 */
import { withAdmin } from '$shared/infrastructure/server';
import { Collections, type TypedPocketBase } from '$shared/infrastructure';
import {
	normalizeCouponCreate,
	toAdminCouponRow,
	type AdminCouponRow,
	type Coupon,
	type NormalizedCouponCreate
} from '../domain/models';

export type { AdminCouponRow };

export async function listAdminCoupons(): Promise<AdminCouponRow[]> {
	return withAdmin(async (pb: TypedPocketBase) => {
		const records = await pb.collection(Collections.Coupons).getFullList<Coupon & { id: string }>({
			sort: '-id'
		});
		return records.map(toAdminCouponRow);
	}, []);
}

export async function createAdminCoupon(input: unknown): Promise<AdminCouponRow> {
	const data: NormalizedCouponCreate = normalizeCouponCreate(input);
	return withAdmin(async (pb: TypedPocketBase) => {
		const record = await pb.collection(Collections.Coupons).create<Coupon & { id: string }>({
			code: data.code,
			type: data.type,
			value: data.value,
			is_active: data.is_active,
			usage_count: 0,
			...(data.min_order_amount !== undefined ? { min_order_amount: data.min_order_amount } : {}),
			...(data.usage_limit !== undefined ? { usage_limit: data.usage_limit } : {}),
			...(data.expire_date !== undefined ? { expire_date: data.expire_date } : {})
		});
		return toAdminCouponRow({ ...record, id: record.id });
	});
}

export async function setCouponActive(
	couponId: string,
	isActive: boolean
): Promise<{ id: string; is_active: boolean }> {
	return withAdmin(async (pb: TypedPocketBase) => {
		const updated = await pb
			.collection(Collections.Coupons)
			.update<Coupon & { id: string }>(couponId, { is_active: isActive });
		return { id: updated.id, is_active: updated.is_active !== false };
	});
}
