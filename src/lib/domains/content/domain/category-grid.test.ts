import { describe, it, expect } from 'vitest';
import { resolveCategoryGridItems, getCategoryGridClass } from './category-grid';
import type { UISection, UIAsset } from './models';
import type { Category } from '$domains/catalog';

describe('category grid resolver', () => {
	it('prioritizes custom items from section.settings.items', () => {
		const section = {
			id: 'sec_1',
			settings: {
				items: [
					{ title: 'Fine Rings', link: '/shop?category=rings', imageUrl: 'https://img.test/rings.jpg' },
					{ title: 'Statement Necklaces', link: '/shop?category=necklaces', imageUrl: 'https://img.test/necklaces.jpg' }
				]
			}
		} as unknown as UISection;

		const items = resolveCategoryGridItems({ section, categories: [] });
		expect(items).toHaveLength(2);
		expect(items[0]).toEqual({
			name: 'Fine Rings',
			link: '/shop?category=rings',
			image: 'https://img.test/rings.jpg'
		});
		expect(items[1].name).toBe('Statement Necklaces');
	});

	it('resolves dynamic categories and excludes hidden ones', () => {
		const categories: Category[] = [
			{
				id: 'c1',
				collectionId: 'pbc_cat',
				collectionName: 'categories',
				title: 'Earrings',
				slug: 'earrings',
				isVisible: true,
				sortOrder: 1,
				image: 'earrings.jpg'
			},
			{
				id: 'c2',
				collectionId: 'pbc_cat',
				collectionName: 'categories',
				title: 'Hidden Seasonal',
				slug: 'hidden',
				isVisible: false,
				sortOrder: 2
			},
			{
				id: 'c3',
				collectionId: 'pbc_cat',
				collectionName: 'categories',
				title: 'Bracelets',
				slug: 'bracelets',
				isVisible: true,
				sortOrder: 3,
				image: 'bracelets.jpg'
			}
		];

		const items = resolveCategoryGridItems({ categories });
		expect(items).toHaveLength(2);
		expect(items.map((i) => i.name)).toEqual(['Earrings', 'Bracelets']);
		expect(items[0].link).toBe('/shop?category=earrings');
		expect(items[1].link).toBe('/shop?category=bracelets');
	});

	it('falls back to legacy defaults when no categories or items provided', () => {
		const items = resolveCategoryGridItems({
			categories: [],
			assets: [
				{
					key: 'hero_category_accessories',
					url: 'https://img.test/acc.jpg'
				} as unknown as UIAsset
			]
		});

		expect(items).toHaveLength(3);
		expect(items[0].name).toBe('ACCESSORIES');
		expect(items[0].image).toBe('https://img.test/acc.jpg');
	});

	it('computes responsive grid layout classes based on item count', () => {
		expect(getCategoryGridClass(2)).toBe('grid-cols-1 md:grid-cols-2');
		expect(getCategoryGridClass(4)).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
		expect(getCategoryGridClass(3)).toBe('grid-cols-1 md:grid-cols-3');
		expect(getCategoryGridClass(6)).toBe('grid-cols-1 md:grid-cols-3');
	});
});
