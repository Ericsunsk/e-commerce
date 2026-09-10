import { describe, it, expect, vi } from 'vitest';
import {
	normalizeFulfillBody,
	canMarkShipped,
	subscribeOrderShipped,
	emitOrderShipped,
	clearShippedListeners
} from './order-fulfillment';

describe('fulfillment payload', () => {
	it('accepts carrier plus tracking number (both spellings)', () => {
		expect(normalizeFulfillBody({ carrier: 'UPS', trackingNumber: '1Z1' })).toEqual({
			carrier: 'UPS',
			trackingNumber: '1Z1'
		});
		expect(normalizeFulfillBody({ carrier: ' FedEx ', tracking_number: ' 123 ' })).toEqual({
			carrier: 'FedEx',
			trackingNumber: '123'
		});
	});

	it('rejects missing fields with 400', () => {
		for (const bad of [
			null,
			{},
			{ carrier: 'UPS' },
			{ trackingNumber: '1' },
			{ carrier: '', trackingNumber: '1' }
		]) {
			try {
				normalizeFulfillBody(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});
});

describe('fulfillment transition', () => {
	it('allows shipping only from paid or processing', () => {
		expect(canMarkShipped('paid')).toBe(true);
		expect(canMarkShipped('processing')).toBe(true);
		for (const status of ['pending', 'shipped', 'delivered', 'refunded', 'cancelled', undefined]) {
			expect(canMarkShipped(status)).toBe(false);
		}
	});
});

describe('shipment notifications', () => {
	it('fans out to sinks and isolates failures', async () => {
		clearShippedListeners();
		const logged: unknown[] = [];
		const orig = console.error;
		console.error = (...args: unknown[]) => {
			logged.push(args);
		};
		const first = vi.fn();
		const second = vi.fn();
		try {
			subscribeOrderShipped(() => {
				throw new Error('sms down');
			});
			subscribeOrderShipped(first);
			subscribeOrderShipped(second);
			await emitOrderShipped({
				orderId: 'o1',
				carrier: 'UPS',
				trackingNumber: '1Z1',
				customerEmail: 'a@b.c',
				shippedAt: new Date().toISOString()
			});
		} finally {
			console.error = orig;
			clearShippedListeners();
		}
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		expect(logged.length).toBeGreaterThan(0);
	});
});
