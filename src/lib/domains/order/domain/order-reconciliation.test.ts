import { describe, it, expect, vi } from 'vitest';
import { withKeyedLock } from '$shared/infrastructure/server/locks.server';
import {
	reconcileOrder,
	reassembleOrderData,
	splitOrderData,
	type ReconciliationPorts,
	type ReconciledOrderData
} from './order-reconciliation';

function orderData(overrides: Partial<ReconciledOrderData> = {}): ReconciledOrderData {
	return {
		placed_at_override: new Date().toISOString(),
		cart_record_id: '',
		user_id: 'u1',
		customer_email: 'a@b.c',
		customer_name: 'A',
		items: [
			{
				id: 'p1',
				productId: 'rec-p1',
				variantId: 'v1',
				title: 'Tee',
				price: 5000,
				quantity: 1,
				color: 'Red',
				size: 'M',
				image: 'img'
			}
		],
		amount_subtotal: 5000,
		amount_shipping: 0,
		amount_tax: 0,
		amount_total: 5000,
		currency: 'usd',
		shipping_address: {},
		coupon_code: '',
		...overrides
	};
}

function metadataFor(data: ReconciledOrderData): Record<string, string> {
	const parts = splitOrderData(JSON.stringify(data));
	return {
		order_data_parts: String(parts.length),
		...Object.fromEntries(parts.map((part, i) => [`order_data_part_${i + 1}`, part]))
	};
}

function ports(overrides: Partial<ReconciliationPorts> = {}): ReconciliationPorts {
	return {
		payments: {
			retrievePaymentIntent: vi.fn().mockResolvedValue({
				id: 'pi_1',
				status: 'succeeded',
				metadata: metadataFor(orderData())
			})
		},
		orders: {
			findByPaymentIntentId: vi.fn().mockResolvedValue(null),
			createOrder: vi.fn().mockResolvedValue('order_1')
		},
		inventory: {
			deduct: vi.fn().mockResolvedValue({ success: true })
		},
		lock: ((_key: string, task: () => Promise<unknown>) => task()) as ReconciliationPorts['lock'],
		...overrides
	};
}

describe('order reconciliation', () => {
	it('short-circuits when the order already exists (no stripe call)', async () => {
		const p = ports({
			orders: {
				findByPaymentIntentId: vi.fn().mockResolvedValue('order_9'),
				createOrder: vi.fn()
			}
		});
		const result = await reconcileOrder(p, 'pi_1');
		expect(result).toEqual({ outcome: 'already-exists', orderId: 'order_9' });
		expect(p.payments.retrievePaymentIntent).not.toHaveBeenCalled();
		expect(p.orders.createOrder).not.toHaveBeenCalled();
	});

	it('creates the order and deducts inventory when missing and payment succeeded', async () => {
		const p = ports();
		const result = await reconcileOrder(p, 'pi_1');
		expect(result).toEqual({ outcome: 'created', orderId: 'order_1', inventoryDeducted: true });
		expect(p.orders.createOrder).toHaveBeenCalledTimes(1);
		expect(p.inventory.deduct).toHaveBeenCalledWith('order_1', expect.any(Array));
	});

	it('promotes status to paid only after inventory succeeds', async () => {
		const update = vi.fn().mockResolvedValue(undefined);
		const p = ports({
			orderStatus: { update }
		});
		const result = await reconcileOrder(p, 'pi_1');
		expect(result).toEqual({ outcome: 'created', orderId: 'order_1', inventoryDeducted: true });
		expect(update).toHaveBeenCalledWith('order_1', 'paid');
	});

	it('cancels the order when inventory deduction fails', async () => {
		const update = vi.fn().mockResolvedValue(undefined);
		const p = ports({
			inventory: {
				deduct: vi.fn().mockResolvedValue({ success: false })
			},
			orderStatus: { update }
		});
		const result = await reconcileOrder(p, 'pi_1');
		expect(result).toEqual({ outcome: 'created', orderId: 'order_1', inventoryDeducted: false });
		expect(update).toHaveBeenCalledWith('order_1', 'cancelled');
	});


	it('waits for payment when the intent has not succeeded', async () => {
		const p = ports({
			payments: {
				retrievePaymentIntent: vi
					.fn()
					.mockResolvedValue({ id: 'pi_1', status: 'requires_payment_method', metadata: {} })
			}
		});
		const result = await reconcileOrder(p, 'pi_1');
		expect(result).toEqual({ outcome: 'not-ready', orderId: null });
		expect(p.orders.createOrder).not.toHaveBeenCalled();
	});

	it('yields to a webhook that wins the race (no duplicate order)', async () => {
		const findByPaymentIntentId = vi
			.fn()
			.mockResolvedValueOnce(null) // fast path
			.mockResolvedValueOnce(null) // inside lock, before stripe
			.mockResolvedValueOnce('order_webhook'); // after stripe: webhook created it
		const p = ports({ orders: { findByPaymentIntentId, createOrder: vi.fn() } });
		const result = await reconcileOrder(p, 'pi_1');
		expect(result).toEqual({ outcome: 'already-exists', orderId: 'order_webhook' });
		expect(p.orders.createOrder).not.toHaveBeenCalled();
	});

	it('reports missing order data instead of creating junk', async () => {
		const p = ports({
			payments: {
				retrievePaymentIntent: vi
					.fn()
					.mockResolvedValue({ id: 'pi_1', status: 'succeeded', metadata: {} })
			}
		});
		const result = await reconcileOrder(p, 'pi_1');
		expect(result).toEqual({ outcome: 'missing-order-data', orderId: null });
		expect(p.orders.createOrder).not.toHaveBeenCalled();
	});

	it('creates exactly one order under concurrent arrivals', async () => {
		let created = 0;
		const createdIds: string[] = [];
		const p = ports({
			orders: {
				findByPaymentIntentId: vi.fn().mockImplementation(async () => {
					await new Promise((r) => setTimeout(r, 5));
					return createdIds[0] ?? null;
				}),
				createOrder: vi.fn().mockImplementation(async () => {
					await new Promise((r) => setTimeout(r, 5));
					created += 1;
					createdIds.push(`order_${created}`);
					return createdIds[createdIds.length - 1];
				})
			},
			lock: withKeyedLock
		});
		const results = await Promise.all([
			reconcileOrder(p, 'pi_1'),
			reconcileOrder(p, 'pi_1'),
			reconcileOrder(p, 'pi_1')
		]);
		expect(created).toBe(1);
		expect(results.filter((r) => r.outcome === 'created')).toHaveLength(1);
		expect(results.filter((r) => r.outcome === 'already-exists')).toHaveLength(2);
	});

	it('reassembles chunked metadata and rejects malformed input', () => {
		const data = orderData();
		const metadata = metadataFor(data);
		expect(reassembleOrderData(metadata)).toMatchObject({ user_id: 'u1', amount_total: 5000 });
		expect(reassembleOrderData({})).toBeNull();
		expect(reassembleOrderData({ order_data_parts: '2', order_data_part_1: 'x' })).toBeNull();
	});
});
