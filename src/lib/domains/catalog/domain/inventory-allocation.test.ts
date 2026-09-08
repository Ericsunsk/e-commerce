import { describe, it, expect, vi } from 'vitest';
import { withKeyedLock } from '$shared/infrastructure/server/locks.server';
import { allocateInventory, type InventoryClient } from './inventory-allocation';

describe('InventoryAllocation domain module', () => {
	describe('happy path', () => {
		it('deducts inventory when sufficient stock exists', async () => {
			const items = [
				{ productId: 'p1', variantId: 'v1', quantity: 2 },
				{ productId: 'p2', quantity: 1 } // variant to be looked up
			];

			const client: InventoryClient = {
				getVariant: vi.fn().mockImplementation((id) => {
					if (id === 'v1') return { id: 'v1', product: 'p1', stock_quantity: 5 };
					if (id === 'v2') return { id: 'v2', product: 'p2', stock_quantity: 3 };
					return null;
				}),
				getVariantsForProduct: vi
					.fn()
					.mockResolvedValue([{ id: 'v2', product: 'p2', stock_quantity: 3 }]),
				updateStock: vi.fn().mockResolvedValue(undefined)
			};

			const lockFn = vi.fn().mockImplementation((_key, task) => task());

			const request = { orderId: 'order1', items };
			const result = await allocateInventory(client, lockFn, request);

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(2);
			expect(result.results[0]).toMatchObject({
				productId: 'p1',
				variantId: 'v1',
				success: true,
				previousStock: 5,
				newStock: 3
			});
			expect(result.results[1]).toMatchObject({
				productId: 'p2',
				variantId: 'v2',
				success: true,
				previousStock: 3,
				newStock: 2
			});

			expect(client.updateStock).toHaveBeenCalledWith('v1', 3);
			expect(client.updateStock).toHaveBeenCalledWith('v2', 2);
			expect(lockFn).toHaveBeenCalledTimes(2);
		});
	});

	describe('error cases', () => {
		it('rejects when insufficient stock', async () => {
			const items = [{ productId: 'p1', variantId: 'v1', quantity: 10 }];

			const client: InventoryClient = {
				getVariant: vi.fn().mockResolvedValue({ id: 'v1', product: 'p1', stock_quantity: 5 }),
				getVariantsForProduct: vi.fn().mockResolvedValue([]),
				updateStock: vi.fn().mockResolvedValue(undefined)
			};

			const lockFn = vi.fn().mockImplementation((_key, task) => task());

			const request = { orderId: 'order1', items };
			const result = await allocateInventory(client, lockFn, request);

			expect(result.success).toBe(false);
			expect(result.results[0]).toMatchObject({
				productId: 'p1',
				variantId: 'v1',
				success: false,
				previousStock: 5,
				newStock: 5,
				error: expect.stringContaining('Insufficient stock')
			});
			expect(client.updateStock).not.toHaveBeenCalled();
		});

		it('rejects when variant not found', async () => {
			const items = [{ productId: 'p1', variantId: 'v1', quantity: 1 }];

			const client: InventoryClient = {
				getVariant: vi.fn().mockResolvedValue(null),
				getVariantsForProduct: vi.fn().mockResolvedValue([]),
				updateStock: vi.fn().mockResolvedValue(undefined)
			};

			const lockFn = vi.fn().mockImplementation((_key, task) => task());

			const request = { orderId: 'order1', items };
			const result = await allocateInventory(client, lockFn, request);

			expect(result.success).toBe(false);
			expect(result.results[0]).toMatchObject({
				productId: 'p1',
				variantId: 'v1',
				success: false,
				previousStock: 0,
				newStock: 0,
				error: 'Variant v1 not found'
			});
		});

		it('rejects when variant belongs to different product', async () => {
			const items = [{ productId: 'p1', variantId: 'v1', quantity: 1 }];

			const client: InventoryClient = {
				getVariant: vi.fn().mockResolvedValue({ id: 'v1', product: 'p2', stock_quantity: 5 }),
				getVariantsForProduct: vi.fn().mockResolvedValue([]),
				updateStock: vi.fn().mockResolvedValue(undefined)
			};

			const lockFn = vi.fn().mockImplementation((_key, task) => task());

			const request = { orderId: 'order1', items };
			const result = await allocateInventory(client, lockFn, request);

			expect(result.success).toBe(false);
			expect(result.results[0]).toMatchObject({
				productId: 'p1',
				variantId: 'v1',
				success: false,
				previousStock: 0,
				newStock: 0,
				error: 'variantId does not belong to productId'
			});
		});

		it('rejects when no variants found for product (variantId not provided)', async () => {
			const items = [{ productId: 'p1', quantity: 1 }];

			const client: InventoryClient = {
				getVariant: vi.fn().mockResolvedValue(null),
				getVariantsForProduct: vi.fn().mockResolvedValue([]),
				updateStock: vi.fn().mockResolvedValue(undefined)
			};

			const lockFn = vi.fn().mockImplementation((_key, task) => task());

			const request = { orderId: 'order1', items };
			const result = await allocateInventory(client, lockFn, request);

			expect(result.success).toBe(false);
			expect(result.results[0]).toMatchObject({
				productId: 'p1',
				variantId: null,
				success: false,
				previousStock: 0,
				newStock: 0,
				error: 'No variants found for product; variantId is required'
			});
		});

		it('rejects when multiple variants found (variantId not provided)', async () => {
			const items = [{ productId: 'p1', quantity: 1 }];

			const client: InventoryClient = {
				getVariant: vi.fn().mockResolvedValue(null),
				getVariantsForProduct: vi.fn().mockResolvedValue([
					{ id: 'v1', product: 'p1', stock_quantity: 5 },
					{ id: 'v2', product: 'p1', stock_quantity: 3 }
				]),
				updateStock: vi.fn().mockResolvedValue(undefined)
			};

			const lockFn = vi.fn().mockImplementation((_key, task) => task());

			const request = { orderId: 'order1', items };
			const result = await allocateInventory(client, lockFn, request);

			expect(result.success).toBe(false);
			expect(result.results[0]).toMatchObject({
				productId: 'p1',
				variantId: null,
				success: false,
				previousStock: 0,
				newStock: 0,
				error: 'Multiple variants found; variantId is required'
			});
		});
	});

	describe('locking', () => {
		it('invokes lock for each item', async () => {
			const items = [
				{ productId: 'p1', variantId: 'v1', quantity: 1 },
				{ productId: 'p1', variantId: 'v2', quantity: 1 }
			];

			const client: InventoryClient = {
				getVariant: vi
					.fn()
					.mockReturnValueOnce({ id: 'v1', product: 'p1', stock_quantity: 5 })
					.mockReturnValueOnce({ id: 'v2', product: 'p1', stock_quantity: 5 }),
				getVariantsForProduct: vi.fn().mockResolvedValue([]),
				updateStock: vi.fn().mockResolvedValue(undefined)
			};

			const lockFn = vi.fn().mockImplementation((_key, task) => task());

			const request = { orderId: 'order1', items };
			await allocateInventory(client, lockFn, request);

			expect(lockFn).toHaveBeenCalledTimes(2);
			expect(lockFn).toHaveBeenCalledWith('inventory:variant:v1', expect.any(Function));
			expect(lockFn).toHaveBeenCalledWith('inventory:variant:v2', expect.any(Function));
		});

		it('prevents oversell under concurrent deductions on the same variant', async () => {
			let stock = 5;
			const client: InventoryClient = {
				getVariant: vi.fn().mockImplementation(async () => {
					// Yield to widen the race window; the keyed lock must serialize.
					await new Promise((resolve) => setTimeout(resolve, 5));
					return { id: 'v1', product: 'p1', stock_quantity: stock };
				}),
				getVariantsForProduct: vi.fn().mockResolvedValue([]),
				updateStock: vi.fn().mockImplementation(async (_id, next) => {
					await new Promise((resolve) => setTimeout(resolve, 5));
					stock = next;
				})
			};

			const makeRequest = (orderId: string) => ({
				orderId,
				items: [{ productId: 'p1', variantId: 'v1', quantity: 4 }]
			});

			const [first, second] = await Promise.all([
				allocateInventory(client, withKeyedLock, makeRequest('order-a')),
				allocateInventory(client, withKeyedLock, makeRequest('order-b'))
			]);

			const successes = [first, second].filter((r) => r.success);
			expect(successes).toHaveLength(1);
			expect(stock).toBe(1);
		});
	});
});
