import { describe, it, expect } from 'vitest';
import { getOrderStatusLabel } from './models';

describe('Order Domain Models and Rules', () => {
	it('translates order status to localized Chinese label', () => {
		expect(getOrderStatusLabel('paid')).toBe('已付款');
		expect(getOrderStatusLabel('shipped')).toBe('已发货');
		expect(getOrderStatusLabel('delivered')).toBe('已送达');
		expect(getOrderStatusLabel('refunded')).toBe('已退款');
		expect(getOrderStatusLabel('custom_unknown')).toBe('custom_unknown');
	});
});
