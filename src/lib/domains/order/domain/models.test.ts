import { describe, it, expect } from 'vitest';
import {
	getOrderStatusColor,
	getOrderStatusLabel,
	getOrderStatusBadgeClass
} from './models';

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

	it('translates order status to localized Chinese label', () => {
		expect(getOrderStatusLabel('paid')).toBe('已付款');
		expect(getOrderStatusLabel('shipped')).toBe('已发货');
		expect(getOrderStatusLabel('delivered')).toBe('已送达');
		expect(getOrderStatusLabel('refunded')).toBe('已退款');
		expect(getOrderStatusLabel('custom_unknown')).toBe('custom_unknown');
	});

	it('returns appropriate badge classes for status', () => {
		expect(getOrderStatusBadgeClass('paid')).toContain('bg-amber-50');
		expect(getOrderStatusBadgeClass('shipped')).toContain('bg-sky-50');
		expect(getOrderStatusBadgeClass('delivered')).toContain('bg-emerald-50');
		expect(getOrderStatusBadgeClass('refunded')).toContain('bg-rose-50');
		expect(getOrderStatusBadgeClass('unknown')).toContain('bg-zinc-100');
	});
});
