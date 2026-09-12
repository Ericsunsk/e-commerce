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
			is_featured: true,
			category: ['cat_tops', 'cat_new'],
			variants: [{ color: 'Red', size: 'M', sku: 'TEE-R-M', stockQuantity: 5 }]
		});
		expect(created).toMatchObject({
			title: 'Classic Tee',
			slug: 'classic-tee',
			unitAmountCents: 4999,
			currency: 'usd',
			isActive: true,
			isFeatured: true,
			category: ['cat_tops', 'cat_new']
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
		expect(normalizeProductEdit({ compare_at_price: 99.99 })).toMatchObject({
			compareAtCents: 9999
		});
		expect(normalizeProductEdit({ compare_at_price: '' })).toMatchObject({ compareAtCents: null });
		expect(
			normalizeProductEdit({ material: '  棉  ', care: '手洗', details: ['A', ''] })
		).toMatchObject({ material: '棉', care: '手洗', details: ['A'] });
		expect(
			normalizeProductEdit({
				is_featured: true,
				category: ['cat_1', 'cat_2']
			})
		).toEqual({
			isFeatured: true,
			category: ['cat_1', 'cat_2']
		});
		expect(
			normalizeProductCreate({
				title: 'Launch Tee',
				price: 49.99,
				compare_at_price: 79.99
			})
		).toMatchObject({ compareAtCents: 7999 });
		expect(normalizeProductCreate({ title: 'Launch Tee', price: 49.99 })).toMatchObject({
			compareAtCents: null
		});
		expect(
			normalizeProductCreate({
				title: 'Launch Tee',
				price: 49.99,
				material: '100% 亚麻',
				care: '冷水机洗',
				details: ['法式剪裁', '', '  ', '预缩处理']
			})
		).toMatchObject({
			material: '100% 亚麻',
			care: '冷水机洗',
			details: ['法式剪裁', '预缩处理']
		});
		expect(normalizeProductCreate({ title: 'Launch Tee', price: 49.99 })).toMatchObject({
			material: '',
			care: '',
			details: []
		});
		try {
			normalizeProductCreate({ title: 'Launch Tee', price: 49.99, material: 'x'.repeat(301) });
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ status: 400 });
		}
		try {
			normalizeProductCreate({
				title: 'Launch Tee',
				price: 49.99,
				details: Array.from({ length: 21 }, (_, i) => `d${i}`)
			});
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ status: 400 });
		}
		try {
			normalizeProductEdit({ title: 'x' });
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ status: 400 });
		}
		try {
			normalizeProductEdit({ compare_at_price: -5 });
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ status: 400 });
		}
	});

	it('validates variant gallery lists', () => {
		const base = { color: '红', size: 'M', sku: 'SKU-1', stockQuantity: 1 };
		expect(
			normalizeProductEdit({ variants: [{ ...base, gallery: ['a.jpg', 'b.jpg'] }] }).variants
		).toMatchObject([{ gallery: ['a.jpg', 'b.jpg'] }]);
		for (const bad of [
			{ ...base, gallery: 'nope' },
			{ ...base, gallery: [''] },
			{ ...base, gallery: Array.from({ length: 5 }, (_, i) => `${i}.jpg`) }
		]) {
			try {
				normalizeProductEdit({ variants: [bad] });
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('derives the product price from the lowest variant price as a fallback', () => {
		const base = { color: '红', size: 'M', stockQuantity: 1 };

		// Variant prices differ by colour/size; the product-level price follows
		// the cheapest one so list pages can advertise a "from" price.
		expect(
			normalizeProductEdit({
				variants: [
					{ ...base, sku: 'A', price: 80 },
					{ ...base, sku: 'B', price: 55 },
					{ ...base, sku: 'C', price: 99 }
				]
			})
		).toMatchObject({ unitAmountCents: 5500 });

		// An explicit product price always wins over the derived fallback.
		expect(
			normalizeProductEdit({ price: 42, variants: [{ ...base, sku: 'A', price: 80 }] })
		).toMatchObject({ unitAmountCents: 4200 });

		// Variants without their own price leave the fallback unset.
		const none = normalizeProductEdit({ variants: [{ ...base, sku: 'A' }] });
		expect(none.unitAmountCents).toBeUndefined();
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
