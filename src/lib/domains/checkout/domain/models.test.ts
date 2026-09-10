import { describe, it, expect } from 'vitest';
import {
	normalizeCouponCode,
	getCouponStateIssue,
	calculateCouponDiscount,
	normalizeCouponCreate,
	toAdminCouponRow,
	type Coupon
} from './models';
import { shippingAddressSchema } from './schemas';

describe('Checkout Domain Models and Rules', () => {
	it('normalizes coupon code', () => {
		expect(normalizeCouponCode('  save10  ')).toBe('SAVE10');
	});

	it('detects coupon issues (inactive, expired, limit_reached)', () => {
		const inactive: Coupon = {
			id: 'c1',
			code: 'OFF',
			type: 'percentage',
			value: 10,
			is_active: false
		};
		expect(getCouponStateIssue(inactive)).toBe('inactive');

		const expired: Coupon = {
			id: 'c2',
			code: 'OLD',
			type: 'percentage',
			value: 10,
			is_active: true,
			expire_date: '2020-01-01T00:00:00Z'
		};
		expect(getCouponStateIssue(expired)).toBe('expired');

		const limitReached: Coupon = {
			id: 'c3',
			code: 'MAXED',
			type: 'percentage',
			value: 10,
			is_active: true,
			usage_limit: 5,
			usage_count: 5
		};
		expect(getCouponStateIssue(limitReached)).toBe('limit_reached');
	});

	it('calculates percentage and fixed amount discounts correctly', () => {
		const percentCoupon: Coupon = {
			id: 'c1',
			code: 'TEN',
			type: 'percentage',
			value: 10,
			is_active: true
		};
		expect(calculateCouponDiscount(percentCoupon, 10000)).toBe(1000); // 10% of $100

		const fixedCoupon: Coupon = {
			id: 'c2',
			code: 'TWENTY',
			type: 'fixed_amount',
			value: 20,
			is_active: true
		};
		expect(calculateCouponDiscount(fixedCoupon, 5000)).toBe(2000); // $20 off $50
		expect(calculateCouponDiscount(fixedCoupon, 1000)).toBe(1000); // capped at subtotal
	});

	it('validates shipping address schema', () => {
		const valid = shippingAddressSchema.safeParse({
			email: 'buyer@example.com',
			firstName: 'John',
			lastName: 'Doe',
			address: '123 Market St',
			zip: '94103',
			city: 'San Francisco',
			state: 'CA',
			country: 'US'
		});
		expect(valid.success).toBe(true);

		const invalidZip = shippingAddressSchema.safeParse({
			email: 'buyer@example.com',
			firstName: 'John',
			lastName: 'Doe',
			address: '123 Market St',
			zip: 'invalid-zip',
			city: 'San Francisco',
			state: 'CA',
			country: 'US'
		});
		expect(invalidZip.success).toBe(false);
	});

	it('validates admin coupon creation bounds', () => {
		expect(
			normalizeCouponCreate({ code: ' save10 ', type: 'percentage', value: 15 })
		).toMatchObject({ code: 'SAVE10', type: 'percentage', value: 15, is_active: true });

		expect(
			normalizeCouponCreate({
				code: 'FLAT20',
				type: 'fixed_amount',
				value: 20,
				min_order_amount: 50,
				usage_limit: 100,
				expire_date: new Date(Date.now() + 86400000).toISOString()
			})
		).toMatchObject({ code: 'FLAT20', usage_limit: 100 });

		for (const bad of [
			{ code: 'AB', type: 'percentage', value: 10 },
			{ code: 'BAD CODE!', type: 'percentage', value: 10 },
			{ code: 'OK10', type: 'bogus', value: 10 },
			{ code: 'OK10', type: 'percentage', value: 0 },
			{ code: 'OK10', type: 'percentage', value: 101 },
			{ code: 'OK10', type: 'fixed_amount', value: -5 },
			{ code: 'OK10', type: 'percentage', value: 10, usage_limit: 0 },
			{ code: 'OK10', type: 'percentage', value: 10, min_order_amount: -1 },
			{ code: 'OK10', type: 'percentage', value: 10, expire_date: '2020-01-01' }
		]) {
			try {
				normalizeCouponCreate(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('projects admin coupon rows with redemption stats', () => {
		expect(
			toAdminCouponRow({
				id: 'c1',
				code: 'SAVE10',
				type: 'percentage',
				value: 10,
				is_active: true,
				usage_count: 3,
				usage_limit: 100,
				min_order_amount: 50,
				expire_date: '2027-01-01T00:00:00Z'
			})
		).toMatchObject({
			id: 'c1',
			code: 'SAVE10',
			isActive: true,
			usageCount: 3,
			usageLimit: 100,
			minOrderAmount: 50
		});
	});
});
