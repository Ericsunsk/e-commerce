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

export interface CouponCreateInput {
	code: string;
	type: 'percentage' | 'fixed_amount';
	/** Percentage 1–100, or fixed dollars > 0. */
	value: number;
	min_order_amount?: number;
	usage_limit?: number;
	expire_date?: string;
	is_active?: boolean;
}

export interface NormalizedCouponCreate {
	code: string;
	type: 'percentage' | 'fixed_amount';
	value: number;
	min_order_amount?: number;
	usage_limit?: number;
	expire_date?: string;
	is_active: boolean;
}

function throwCouponIssue(message: string): never {
	throw { status: 400, message };
}

/** Validate admin coupon creation input; normalizes code and bounds. */
export function normalizeCouponCreate(input: unknown): NormalizedCouponCreate {
	if (!input || typeof input !== 'object') throwCouponIssue('Invalid coupon payload');
	const data = input as Record<string, unknown>;

	const code = typeof data.code === 'string' ? data.code.trim().toUpperCase() : '';
	if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
		throwCouponIssue('Code must be 3–24 characters (letters, digits, _ or -)');
	}

	const type = data.type;
	if (type !== 'percentage' && type !== 'fixed_amount') {
		throwCouponIssue('Type must be percentage or fixed_amount');
	}

	const value = Number(data.value);
	if (!Number.isFinite(value) || value <= 0) throwCouponIssue('Value must be positive');
	if (type === 'percentage' && value > 100) {
		throwCouponIssue('Percentage value cannot exceed 100');
	}

	const normalized: NormalizedCouponCreate = {
		code,
		type,
		value,
		is_active: data.is_active === undefined ? true : data.is_active === true
	};

	if (
		data.min_order_amount !== undefined &&
		data.min_order_amount !== null &&
		data.min_order_amount !== ''
	) {
		const minOrder = Number(data.min_order_amount);
		if (!Number.isFinite(minOrder) || minOrder < 0) {
			throwCouponIssue('Minimum order amount must be >= 0');
		}
		normalized.min_order_amount = minOrder;
	}

	if (data.usage_limit !== undefined && data.usage_limit !== null && data.usage_limit !== '') {
		const limit = Number(data.usage_limit);
		if (!Number.isInteger(limit) || limit < 1) {
			throwCouponIssue('Usage limit must be an integer >= 1');
		}
		normalized.usage_limit = limit;
	}

	if (typeof data.expire_date === 'string' && data.expire_date.trim()) {
		const expiry = new Date(data.expire_date);
		if (Number.isNaN(expiry.getTime())) throwCouponIssue('Expiry date is invalid');
		if (expiry <= new Date()) throwCouponIssue('Expiry date must be in the future');
		normalized.expire_date = expiry.toISOString();
	}

	return normalized;
}

export interface AdminCouponRow {
	id: string;
	code: string;
	type: 'percentage' | 'fixed_amount';
	value: number;
	isActive: boolean;
	usageCount: number;
	usageLimit: number | null;
	minOrderAmount: number | null;
	expireDate: string | null;
}

/** Pure admin table projection (unit-testable without PocketBase). */
export function toAdminCouponRow(record: Coupon & { id: string }): AdminCouponRow {
	return {
		id: record.id,
		code: record.code,
		type: record.type,
		value: record.value,
		isActive: record.is_active !== false,
		usageCount: record.usage_count ?? 0,
		usageLimit: record.usage_limit ?? null,
		minOrderAmount: record.min_order_amount ?? null,
		expireDate: record.expire_date ?? null
	};
}
