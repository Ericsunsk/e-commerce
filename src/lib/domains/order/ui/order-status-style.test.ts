import { describe, it, expect } from 'vitest';
import { getOrderStatusColor, getOrderStatusBadgeClass } from './order-status-style';

/**
 * Presentation mapping: status → Tailwind classes. Moved here from
 * `domain/models.test.ts` along with the functions themselves — the domain
 * layer must not know the design system (Constitution Principle IX).
 */
describe('Order status presentation', () => {
	it('returns correct color classes for each order status', () => {
		expect(getOrderStatusColor('paid')).toContain('text-emerald');
		expect(getOrderStatusColor('delivered')).toContain('text-emerald');
		expect(getOrderStatusColor('shipped')).toContain('text-blue');
		expect(getOrderStatusColor('processing')).toContain('text-blue');
		expect(getOrderStatusColor('cancelled')).toContain('text-red');
		expect(getOrderStatusColor('refunded')).toContain('text-red');
		expect(getOrderStatusColor('pending')).toBe('text-neutral-500');
	});

	it('returns appropriate badge classes for status', () => {
		expect(getOrderStatusBadgeClass('paid')).toContain('bg-amber-50');
		expect(getOrderStatusBadgeClass('shipped')).toContain('bg-sky-50');
		expect(getOrderStatusBadgeClass('delivered')).toContain('bg-emerald-50');
		expect(getOrderStatusBadgeClass('refunded')).toContain('bg-rose-50');
		expect(getOrderStatusBadgeClass('unknown')).toContain('bg-zinc-100');
	});
});
