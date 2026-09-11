import { describe, it, expect } from 'vitest';
import { toAdminProductRow } from './admin-product-row';
import type { Product } from './models';

function product(overrides: Partial<Product> = {}): Product {
	return {
		id: 'tee',
		collectionId: 'products',
		collectionName: 'products',
		title: 'Tee',
		slug: 'tee',
		price: '$50.00',
		priceValue: 50,
		image: 'img.jpg',
		images: ['img.jpg'],
		isFeature: false,
		hasVariants: true,
		stockStatus: 'in_stock',
		gender: 'unisex',
		variants: [
			{
				id: 'v1',
				collectionId: 'product_variants',
				collectionName: 'product_variants',
				product: 'rec-1',
				color: 'Red',
				size: 'M',
				sku: 'TEE-R-M',
				stockQuantity: 3
			},
			{
				id: 'v2',
				collectionId: 'product_variants',
				collectionName: 'product_variants',
				product: 'rec-1',
				color: 'Blue',
				size: 'L',
				sku: 'TEE-B-L',
				stockQuantity: 2
			}
		],
		...overrides
	};
}

describe('admin product row', () => {
	it('projects pricing, stock aggregates, and status', () => {
		const row = toAdminProductRow(
			product({
				isFeature: true,
				categories: [{ id: 'cat-1', name: 'Tops', slug: 'tops' } as unknown as import('./models').Category]
			}),
			'rec-1',
			true
		);
		expect(row).toMatchObject({
			id: 'rec-1',
			slug: 'tee',
			title: 'Tee',
			price: '$50.00',
			priceValue: 50,
			totalStock: 5,
			variantCount: 2,
			isActive: true,
			isFeatured: true,
			categories: [{ id: 'cat-1', name: 'Tops', slug: 'tops' }]
		});
		expect(row.variants).toHaveLength(2);
		expect(row.variants[0]).toMatchObject({ sku: 'TEE-R-M', color: 'Red', size: 'M', stockQuantity: 3 });
	});

	it('handles variant-less products as zero stock', () => {
		const row = toAdminProductRow(
			product({ variants: undefined, hasVariants: false }),
			'rec-2',
			false
		);
		expect(row).toMatchObject({ totalStock: 0, variantCount: 0, isActive: false });
	});
});
