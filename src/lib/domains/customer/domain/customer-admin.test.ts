import { describe, it, expect } from 'vitest';
import { maskEmail, toCustomerRow } from './customer-admin';

describe('customer admin view', () => {
	it('masks emails for list display', () => {
		expect(maskEmail('alice@example.com')).toBe('a•••@example.com');
		expect(maskEmail('')).toBe('—');
		expect(maskEmail('not-an-email')).toBe('—');
	});

	it('projects rows with verification and counts', () => {
		expect(toCustomerRow({ id: 'u1', email: 'a@b.com', verified: true }, 3)).toMatchObject({
			emailMasked: 'a•••@b.com',
			verified: true,
			orderCount: 3
		});
		expect(toCustomerRow({ id: 'u2', email: 'x@y.com' }, 0).verified).toBe(false);
	});
});
