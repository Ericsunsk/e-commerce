export interface Coupon {
	id: string;
	code: string;
	type: 'percentage' | 'fixed_amount';
	value: number;
	is_active: boolean;
	expire_date?: string;
	min_order_amount?: number;
	usage_limit?: number;
	usage_count?: number;
}

export interface CouponValidationResult {
	valid: boolean;
	coupon?: Coupon;
	discountCents: number;
	error?: string;
}

export type CouponStateIssue = 'inactive' | 'expired' | 'limit_reached';

export function normalizeCouponCode(code: string): string {
	return code.trim().toUpperCase();
}

export function getCouponStateIssue(
	coupon: Pick<Coupon, 'is_active' | 'expire_date' | 'usage_limit' | 'usage_count'>
): CouponStateIssue | null {
	if (!coupon.is_active) return 'inactive';

	if (coupon.expire_date) {
		const expireDate = new Date(coupon.expire_date);
		if (expireDate < new Date()) {
			return 'expired';
		}
	}

	if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
		return 'limit_reached';
	}

	return null;
}

export function calculateCouponDiscount(coupon: Coupon, amountCents: number): number {
	let discountCents = 0;
	if (coupon.type === 'percentage') {
		discountCents = Math.round(amountCents * (coupon.value / 100));
	} else if (coupon.type === 'fixed_amount') {
		discountCents = coupon.value * 100;
	}
	return Math.min(discountCents, amountCents);
}

export const STRIPE = {
	/** Stripe 最小收费金额 (分) */
	MIN_CHARGE_CENTS: 50,
	/** 支持的国家代码 */
	ALLOWED_COUNTRIES: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'] as const,
	/** 支持的货币 */
	SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD'] as const
} as const;

export interface PaymentIntentCustomerInfo {
	userId?: string;
	email?: string;
	name?: string;
	currency?: string;
}
