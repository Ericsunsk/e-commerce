import { describe, it, expect, vi } from 'vitest';

/**
 * Stripe sync orchestration (infrastructure).
 *
 * Lives beside the module it exercises. This suite previously sat inside
 * product-input.test.ts, which forced a domain test file to reach into
 * infrastructure — a layering violation the depcruise gate now catches.
 */
describe('stripe sync orchestration', () => {
	// Imported lazily so a future live-SDK import can never break this suite.
	const load = () => import('./stripe-sync.server');

	function fakeClient(overrides: Record<string, unknown> = {}) {
		return {
			products: {
				create: vi.fn().mockResolvedValue({ id: 'prod_1' }),
				update: vi.fn().mockResolvedValue({}),
				...(overrides.products as object | undefined)
			},
			prices: {
				create: vi.fn().mockResolvedValue({ id: 'price_2' }),
				update: vi.fn().mockResolvedValue({}),
				retrieve: vi.fn().mockResolvedValue({ id: 'price_1', unit_amount: 5000, currency: 'usd' }),
				...(overrides.prices as object | undefined)
			}
		};
	}

	it('provisions product then price', async () => {
		const { createProductWithStripe } = await load();
		const client = fakeClient();
		const result = await createProductWithStripe(client, {
			name: 'Tee',
			unitAmountCents: 5000,
			currency: 'usd'
		});
		expect(result).toEqual({ productId: 'prod_1', priceId: 'price_2' });
		expect(client.products.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tee' }));
		expect(client.prices.create).toHaveBeenCalledWith(
			expect.objectContaining({ product: 'prod_1', unit_amount: 5000 })
		);
	});

	it('rolls back the stripe product when price creation fails', async () => {
		const { createProductWithStripe } = await load();
		const client = fakeClient({
			prices: {
				create: vi.fn().mockRejectedValue(new Error('stripe down')),
				update: vi.fn(),
				retrieve: vi.fn()
			}
		});
		await expect(
			createProductWithStripe(client, { name: 'Tee', unitAmountCents: 5000, currency: 'usd' })
		).rejects.toThrow('stripe down');
		expect(client.products.update).toHaveBeenCalledWith('prod_1', { active: false });
	});

	it('rolls the price only when money changes', async () => {
		const { rollProductPrice } = await load();
		const same = fakeClient();
		expect(
			await rollProductPrice(same, {
				productId: 'prod_1',
				oldPriceId: 'price_1',
				unitAmountCents: 5000,
				currency: 'usd'
			})
		).toEqual({ priceId: 'price_1', rolled: false });
		expect(same.prices.create).not.toHaveBeenCalled();

		const changed = fakeClient();
		expect(
			await rollProductPrice(changed, {
				productId: 'prod_1',
				oldPriceId: 'price_1',
				unitAmountCents: 6000,
				currency: 'usd'
			})
		).toEqual({ priceId: 'price_2', rolled: true });
		expect(changed.prices.update).toHaveBeenCalledWith('price_1', { active: false });
	});
});
