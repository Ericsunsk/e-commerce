import { describe, it, expect, vi } from 'vitest';
import { withTestKeyedLock as withKeyedLock } from '../../../../test/test-lock';
import {
	classifyStripeEvent,
	fulfillSucceededPayment,
	mapChargeRefunded,
	type SucceededPorts
} from './stripe-webhook';
import { splitOrderData } from './order-reconciliation';

function metadataFor(items = true) {
	const data = {
		placed_at_override: new Date().toISOString(),
		cart_record_id: 'cart_1',
		user_id: 'u1',
		customer_email: 'a@b.c',
		customer_name: 'A',
		items: items
			? [
					{
						id: 'p1',
						productId: 'rec-p1',
						variantId: 'v1',
						title: 'Tee',
						price: 5000,
						quantity: 1,
						color: 'R',
						size: 'M',
						image: 'img'
					}
				]
			: [],
		amount_subtotal: 5000,
		amount_shipping: 0,
		amount_tax: 0,
		amount_total: 5000,
		currency: 'usd',
		shipping_address: {},
		coupon_code: 'SAVE10'
	};
	const parts = splitOrderData(JSON.stringify(data));
	return {
		order_data_parts: String(parts.length),
		...Object.fromEntries(parts.map((part, i) => [`order_data_part_${i + 1}`, part]))
	};
}

function ports(overrides: Partial<SucceededPorts> = {}): SucceededPorts {
	return {
		orders: {
			findByPaymentIntentId: vi.fn().mockResolvedValue(null),
			createOrder: vi.fn().mockResolvedValue('order_1')
		},
		inventory: {
			deduct: vi.fn().mockResolvedValue({ success: true })
		},
		coupons: {
			incrementUsage: vi.fn().mockResolvedValue(undefined)
		},
		carts: {
			clearCartRecord: vi.fn().mockResolvedValue(undefined)
		},
		orderStatus: {
			update: vi.fn().mockResolvedValue(undefined)
		},
		lock: ((_key: string, task: () => Promise<unknown>) => task()) as SucceededPorts['lock'],
		...overrides
	};
}

describe('webhook dispatch', () => {
	it('classifies stripe events and extracts payment intents', () => {
		expect(
			classifyStripeEvent({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } })
		).toEqual({ kind: 'payment-succeeded', paymentIntentId: 'pi_1' });
		expect(
			classifyStripeEvent({
				type: 'payment_intent.payment_failed',
				data: { object: { id: 'pi_2' } }
			})
		).toEqual({ kind: 'payment-failed', paymentIntentId: 'pi_2' });
		expect(
			classifyStripeEvent({
				type: 'charge.refunded',
				data: { object: { id: 'ch_1', payment_intent: 'pi_3' } }
			})
		).toEqual({ kind: 'charge-refunded', paymentIntentId: 'pi_3' });
		expect(classifyStripeEvent({ type: 'customer.created', data: { object: {} } })).toEqual({
			kind: 'ignored',
			paymentIntentId: null
		});
		expect(classifyStripeEvent({} as never)).toEqual({ kind: 'ignored', paymentIntentId: null });
	});
});

describe('succeeded fulfillment', () => {
	it('creates, deducts, increments coupon, and clears the cart', async () => {
		const p = ports();
		const result = await fulfillSucceededPayment(p, 'pi_1', metadataFor());
		expect(result).toEqual({ outcome: 'created', orderId: 'order_1', inventoryDeducted: true });
		expect(p.orders.createOrder).toHaveBeenCalledTimes(1);
		expect(p.coupons.incrementUsage).toHaveBeenCalledWith('SAVE10');
		expect(p.carts.clearCartRecord).toHaveBeenCalledWith('cart_1');
	});

	it('does not increment coupon or clear cart when inventory deduction fails', async () => {
		const p = ports({
			inventory: {
				deduct: vi.fn().mockResolvedValue({ success: false })
			}
		});
		const result = await fulfillSucceededPayment(p, 'pi_1', metadataFor());
		expect(result).toEqual({ outcome: 'created', orderId: 'order_1', inventoryDeducted: false });
		expect(p.orders.createOrder).toHaveBeenCalledTimes(1);
		expect(p.inventory.deduct).toHaveBeenCalledTimes(1);
		expect(p.coupons.incrementUsage).not.toHaveBeenCalled();
		expect(p.carts.clearCartRecord).not.toHaveBeenCalled();
		expect(p.orderStatus.update).toHaveBeenCalledWith('order_1', 'cancelled');
	});

	it('does not increment coupon or clear cart when inventory deduction throws', async () => {
		const p = ports({
			inventory: {
				deduct: vi.fn().mockRejectedValue(new Error('Insufficient stock'))
			}
		});
		try {
			await fulfillSucceededPayment(p, 'pi_1', metadataFor());
			expect(true).toBe(false); // should not reach here
		} catch (err: unknown) {
			expect((err as Error).message).toBe('Insufficient stock');
		}
		expect(p.orders.createOrder).toHaveBeenCalledTimes(1);
		expect(p.inventory.deduct).toHaveBeenCalledTimes(1);
		expect(p.coupons.incrementUsage).not.toHaveBeenCalled();
		expect(p.carts.clearCartRecord).not.toHaveBeenCalled();
		expect(p.orderStatus.update).toHaveBeenCalledWith('order_1', 'cancelled');
	});


	it('skips every side effect on webhook retries', async () => {
		const p = ports({
			orders: {
				findByPaymentIntentId: vi.fn().mockResolvedValue('order_9'),
				createOrder: vi.fn()
			}
		});
		const result = await fulfillSucceededPayment(p, 'pi_1', metadataFor());
		expect(result).toEqual({ outcome: 'already-exists', orderId: 'order_9' });
		expect(p.orders.createOrder).not.toHaveBeenCalled();
		expect(p.inventory.deduct).not.toHaveBeenCalled();
		expect(p.coupons.incrementUsage).not.toHaveBeenCalled();
		expect(p.carts.clearCartRecord).not.toHaveBeenCalled();
	});

	it('creates exactly once under concurrent deliveries', async () => {
		let created = 0;
		const p = ports({
			orders: {
				findByPaymentIntentId: vi.fn().mockImplementation(async () => {
					await new Promise((r) => setTimeout(r, 5));
					return created > 0 ? 'order_1' : null;
				}),
				createOrder: vi.fn().mockImplementation(async () => {
					await new Promise((r) => setTimeout(r, 5));
					created += 1;
					return 'order_1';
				})
			},
			lock: withKeyedLock
		});
		const results = await Promise.all([
			fulfillSucceededPayment(p, 'pi_1', metadataFor()),
			fulfillSucceededPayment(p, 'pi_1', metadataFor())
		]);
		expect(created).toBe(1);
		expect(p.coupons.incrementUsage).toHaveBeenCalledTimes(1);
		expect(results.map((r) => r.outcome).sort()).toEqual(['already-exists', 'created']);
	});
});

describe('refund mapping', () => {
	it('resolves full vs partial refunds from charge amounts', () => {
		expect(
			mapChargeRefunded({
				id: 'ch_1',
				payment_intent: 'pi_1',
				amount: 5000,
				amount_refunded: 5000,
				refunds: { data: [{ id: 're_1' }] }
			})
		).toEqual({
			paymentIntentId: 'pi_1',
			refundId: 're_1',
			status: 'refunded',
			amountCents: 5000
		});
		expect(
			mapChargeRefunded({ id: 'ch_1', payment_intent: 'pi_1', amount: 5000, amount_refunded: 1000 })
		).toMatchObject({ status: 'partially_refunded', amountCents: 1000, refundId: 'ch_1' });
		expect(mapChargeRefunded({ id: 'ch_1', amount: 5000 })).toBeNull();
	});
});
