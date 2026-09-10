import { describe, it, expect } from 'vitest';
import { buildUserOrdersFilter, buildOrderByIdFilter } from './order-filters';

describe('order visibility filters', () => {
	it('lists only account orders without an email', () => {
		expect(buildUserOrdersFilter('u1')).toEqual({
			template: 'user = {:userId}',
			params: { userId: 'u1' }
		});
	});

	it('unions guest orders by verified email', () => {
		const query = buildUserOrdersFilter('u1', 'guest@example.com');
		expect(query.template).toContain('customer_email = {:email}');
		expect(query.template).toContain('user = ""');
		expect(query.params).toEqual({ userId: 'u1', email: 'guest@example.com' });
	});

	it('scopes the detail filter to one order id', () => {
		const authed = buildOrderByIdFilter('o1', 'u1', 'guest@example.com');
		expect(authed.params).toEqual({ orderId: 'o1', userId: 'u1', email: 'guest@example.com' });
		expect(authed.template).toContain('id = {:orderId}');

		const bare = buildOrderByIdFilter('o1', 'u1');
		expect(bare).toEqual({
			template: 'id = {:orderId} && user = {:userId}',
			params: { orderId: 'o1', userId: 'u1' }
		});
		// No email, no guest branch: other emails stay unreachable.
		expect(bare.template).not.toContain('customer_email');
	});

	it('ignores blank emails', () => {
		expect(buildUserOrdersFilter('u1', '   ')).toEqual({
			template: 'user = {:userId}',
			params: { userId: 'u1' }
		});
	});
});
