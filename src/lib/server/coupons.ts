/**
 * Coupon Service
 * 统一的优惠券验证和计算逻辑
 */

import { pb, initAdmin } from './pocketbase';
import type { Coupon } from '$lib/types';
import { Collections } from '$lib/pocketbase-types';

export interface CouponValidationResult {
    valid: boolean;
    coupon?: Coupon;
    discountCents: number;
    error?: string;
}

/**
 * 验证并计算优惠券折扣
 * @param code - 优惠券代码
 * @param amountCents - 订单金额（分）
 * @returns 验证结果和折扣金额
 */
export async function validateAndApplyCoupon(
    code: string,
    amountCents: number
): Promise<CouponValidationResult> {
    if (!code) {
        return { valid: false, discountCents: 0, error: 'Coupon code is required' };
    }

    try {
        await initAdmin();
        const normalizedCode = code.toUpperCase();

        const coupon = await pb.collection(Collections.Coupons).getFirstListItem<Coupon>(
            pb.filter('code = {:code}', { code: normalizedCode })
        );

        // 1. 检查是否激活
        if (!coupon || !coupon.is_active) {
            return { valid: false, discountCents: 0, error: 'Invalid or inactive coupon' };
        }

        // 2. 检查过期
        if (coupon.expire_date) {
            const expireDate = new Date(coupon.expire_date);
            if (expireDate < new Date()) {
                return { valid: false, discountCents: 0, error: 'Coupon has expired' };
            }
        }

        // 3. 检查使用次数限制
        if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
            return { valid: false, discountCents: 0, error: 'Coupon usage limit reached' };
        }

        // 4. 检查最小订单金额
        const amountDollars = amountCents / 100;
        if (coupon.min_order_amount && amountDollars < coupon.min_order_amount) {
            return {
                valid: false,
                discountCents: 0,
                error: `Minimum order amount of $${coupon.min_order_amount} required`
            };
        }

        // 5. 计算折扣
        let discountCents = 0;
        if (coupon.type === 'percentage') {
            discountCents = Math.round(amountCents * (coupon.value / 100));
        } else if (coupon.type === 'fixed_amount') {
            discountCents = coupon.value * 100;
        }

        // 确保折扣不超过订单金额
        discountCents = Math.min(discountCents, amountCents);

        return {
            valid: true,
            coupon,
            discountCents
        };

    } catch (err: any) {
        if (err.status === 404) {
            return { valid: false, discountCents: 0, error: 'Invalid coupon code' };
        }
        console.error('Coupon validation error:', err);
        return { valid: false, discountCents: 0, error: 'Failed to verify coupon' };
    }
}

/**
 * 增加优惠券使用计数
 */
export async function incrementCouponUsage(couponId: string): Promise<void> {
    try {
        await initAdmin();
        const coupon = await pb.collection(Collections.Coupons).getOne<Coupon>(couponId);
        
        // CONCURRENCY/ABUSE CHECK: Re-verify usage limit before incrementing
        // This is a last-mile check to prevent race conditions where validation passed
        // but usage limit was reached in the split second before payment completion.
        if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
             console.warn(`⚠️ Coupon ${couponId} usage limit exceeded during increment.`);
             // In a stricter system, we might want to flag the order or alert admin,
             // but strictly blocking here is post-payment, so we log it.
             return;
        }

        await pb.collection(Collections.Coupons).update(couponId, {
            usage_count: (coupon.usage_count ?? 0) + 1
        });
    } catch (err) {
        console.error('Failed to increment coupon usage:', err);
    }
}
