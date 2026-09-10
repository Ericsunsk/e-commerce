import { describe, it, expect } from 'vitest';
import { normalizeRefundBody, resolveRefundStatus, formatRefundNote } from './order-refunds';

describe('refund payload', () => {
	it('treats a missing amount as a full refund', () => {
		expect(normalizeRefundBody({}, 5000)).toEqual({ amountCents: null, reason: undefined });
		expect(normalizeRefundBody({ amount: '', reason: '  damaged  ' }, 5000)).toEqual({
			amountCents: null,
			reason: 'damaged'
		});
	});

	it('accepts dollar amounts and converts to cents', () => {
		expect(normalizeRefundBody({ amount: 12.5, reason: 'x' }, 5000)).toEqual({
			amountCents: 1250,
			reason: 'x'
		});
	});

	it('rejects non-positive, excessive, and malformed amounts', () => {
		for (const bad of [{ amount: 0 }, { amount: -5 }, { amount: 60 }, { amount: 'abc' }, null]) {
			try {
				normalizeRefundBody(bad, 5000);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});
});

describe('refund status', () => {
	it('closes full refunds and flags partial ones', () => {
		expect(resolveRefundStatus({ amountCents: null }, 5000)).toBe('refunded');
		expect(resolveRefundStatus({ amountCents: 5000 }, 5000)).toBe('refunded');
		expect(resolveRefundStatus({ amountCents: 1250 }, 5000)).toBe('partially_refunded');
	});

	it('formats the audit note with id, timestamp, and reason', () => {
		const note = formatRefundNote(
			're_1',
			'partially_refunded',
			1250,
			'damaged',
			new Date('2026-01-02T03:04:05Z')
		);
		expect(note).toContain('re_1');
		expect(note).toContain('2026-01-02T03:04:05');
		expect(note).toContain('partially_refunded 12.50');
		expect(note).toContain('damaged');
	});
});
