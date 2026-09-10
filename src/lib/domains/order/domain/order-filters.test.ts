import { describe, it, expect } from 'vitest';
import { buildUserOrdersFilter, buildOrderByIdFilter, renderFilter } from './order-filters';

describe('order visibility filters', () => {
	it('lists only account orders without an email', () => {
		const query = buildUserOrdersFilter('u1');
		expect(query.template).toBe('user = {:userId}');
		expect(renderFilter(query)).toBe('user = "u1"');
	});

	it('unions guest orders by verified email', () => {
		const query = buildUserOrdersFilter('u1', 'guest@example.com');
		expect(query.template).toContain('customer_email = {:email}');
		expect(query.template).toContain('user = ""');
		expect(renderFilter(query)).toBe(
			'user = "u1" || (user = "" && customer_email = "guest@example.com")'
		);
	});

	it('scopes the detail filter to one order id', () => {
		const authed = buildOrderByIdFilter('o1', 'u1', 'guest@example.com');
		const rendered = renderFilter(authed);
		expect(rendered).toContain('id = "o1"');
		expect(rendered).toContain('user = "u1"');
		expect(rendered).toContain('customer_email = "guest@example.com"');

		const bare = renderFilter(buildOrderByIdFilter('o1', 'u1'));
		expect(bare).toBe('id = "o1" && user = "u1"');
		// No email, no guest branch: other emails stay unreachable.
		expect(bare).not.toContain('customer_email');
	});

	it('ignores blank emails and escapes quotes', () => {
		expect(renderFilter(buildUserOrdersFilter('u1', '   '))).toBe('user = "u1"');
		expect(renderFilter(buildUserOrdersFilter('u1', 'a"b@c.d'))).toContain('a\\"b@c.d');
	});
});
