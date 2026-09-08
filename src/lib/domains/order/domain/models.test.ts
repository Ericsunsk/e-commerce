import { describe, it, expect } from 'vitest';
import { getOrderStatusColor, type OrderStatus } from './models';

describe('Order Domain Models and Rules', () => {
	it('returns correct color classes for each order status', () => {
		expect(getOrderStatusColor('paid')).toContain('text-emerald');
		expect(getOrderStatusColor('delivered')).toContain('text-emerald');
		expect(getOrderStatusColor('shipped')).toContain('text-blue');
		expect(getOrderStatusColor('processing')).toContain('text-blue');
		expect(getOrderStatusColor('cancelled')).toContain('text-red');
		expect(getOrderStatusColor('refunded')).toContain('text-red');
		expect(getOrderStatusColor('pending')).toBe('text-neutral-500');
	});
});
