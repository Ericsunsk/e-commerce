import { describe, it, expect, vi } from 'vitest';
import {
	slugifyTitle,
	normalizeProductCreate,
	normalizeProductEdit,
	needsPriceRoll
} from './product-input';

describe('product input', () => {
	it('slugifies titles deterministically', () => {
		expect(slugifyTitle('My Tee 2.0')).toBe('my-tee-2-0');
		expect(slugifyTitle('  Café Noir  ')).toBe('cafe-noir');
		expect(slugifyTitle('!!!')).toBe('product');
	});

	it('validates creation payloads with bounds', () => {
		const created = normalizeProductCreate({
			title: 'Classic Tee',
			description: 'Soft cotton',
			price: 49.99,
			currency: 'USD',
			variants: [{ color: 'Red', size: 'M', sku: 'TEE-R-M', stockQuantity: 5 }]
		});
		expect(created).toMatchObject({
			title: 'Classic Tee',
			slug: 'classic-tee',
			unitAmountCents: 4999,
			currency: 'usd',
			isActive: true
		});

		for (const bad of [
			null,
			{ title: 'A', price: 10 },
			{ title: 'Tee', price: 0 },
			{ title: 'Tee', price: 10, currency: 'XXX' },
			{
				title: 'Tee',
				price: 10,
				variants: [{ color: 'Red', size: 'M', sku: 'X', stockQuantity: -1 }]
			},
			{
				title: 'Tee',
				price: 10,
				variants: [
					{ color: 'R', size: 'M', sku: 'DUP', stockQuantity: 1 },
					{ color: 'B', size: 'L', sku: 'DUP', stockQuantity: 1 }
				]
			}
		]) {
			try {
				normalizeProductCreate(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('validates partial edits', () => {
		expect(normalizeProductEdit({})).toEqual({});
		expect(normalizeProductEdit({ price: 20 })).toMatchObject({ unitAmountCents: 2000 });
		try {
			normalizeProductEdit({ title: 'x' });
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ status: 400 });
		}
	});

	it('detects price rolls only on real money changes', () => {
		expect(
			needsPriceRoll(
				{ priceId: 'price_1', unitAmountCents: 5000, currency: 'usd' },
				{ unitAmountCents: 5000, currency: 'USD' }
			)
		).toBe(false);
		expect(
			needsPriceRoll(
				{ priceId: 'price_1', unitAmountCents: 5000, currency: 'usd' },
				{ unitAmountCents: 6000, currency: 'usd' }
			)
		).toBe(true);
		expect(
			needsPriceRoll(
				{ priceId: 'price_1', unitAmountCents: 5000, currency: 'usd' },
				{ unitAmountCents: 5000, currency: 'eur' }
			)
		).toBe(true);
		expect(needsPriceRoll(null, { unitAmountCents: 5000, currency: 'usd' })).toBe(true);
		expect(
			needsPriceRoll(
				{ priceId: null, unitAmountCents: 5000, currency: 'usd' },
				{ unitAmountCents: 5000, currency: 'usd' }
			)
		).toBe(true);
	});
});

describe('stripe sync orchestration', () => {
	// Imported lazily so a future live-SDK import can never break this suite.
	const load = () => import('../infrastructure/stripe-sync.server');

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
