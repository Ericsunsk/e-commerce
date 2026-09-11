import { describe, it, expect } from 'vitest';
import {
	getCategoryTier,
	groupCategoriesByHierarchy,
	sortCategoriesByHierarchy,
	calculateTierSortShifts
} from './category-hierarchy';

describe('category hierarchy domain', () => {
	it('identifies gender/audience categories', () => {
		expect(getCategoryTier({ slug: 'mens', name: 'Mens' })).toBe('gender');
		expect(getCategoryTier({ slug: 'womens', name: 'Womens' })).toBe('gender');
		expect(getCategoryTier({ slug: 'unisex', name: 'Unisex' })).toBe('gender');
		expect(getCategoryTier({ slug: 'kids', name: 'Kids' })).toBe('gender');
	});

	it('identifies primary/department categories', () => {
		expect(getCategoryTier({ slug: 'tops', name: 'Tops' })).toBe('primary');
		expect(getCategoryTier({ slug: 'bottoms', name: 'Bottoms' })).toBe('primary');
		expect(getCategoryTier({ slug: 'outerwear', name: 'Outerwear' })).toBe('primary');
		expect(getCategoryTier({ slug: 'footwear', name: 'Footwear' })).toBe('primary');
		expect(getCategoryTier({ slug: 'accessories', name: 'Accessories' })).toBe('primary');
	});

	it('identifies subcategories', () => {
		expect(getCategoryTier({ slug: 'hoodies', name: 'Hoodies' })).toBe('subcategory');
		expect(getCategoryTier({ slug: 'pants', name: 'Pants' })).toBe('subcategory');
		expect(getCategoryTier({ slug: 'shoes', name: 'Shoes' })).toBe('subcategory');
		expect(getCategoryTier({ slug: 't-shirts', name: 'T-Shirts' })).toBe('subcategory');
		expect(getCategoryTier({ slug: 'custom-sub', name: 'Custom Sub', parent: 'parent-id' })).toBe('subcategory');
	});

	it('identifies tier via explicit tier field or description tag', () => {
		expect(getCategoryTier({ name: '自定义男士专区', slug: 'custom-1', tier: 'gender' })).toBe('gender');
		expect(getCategoryTier({ name: '自定义主品类', slug: 'custom-2', description: 'tier:primary' })).toBe('primary');
		expect(getCategoryTier({ name: '自定义三级分类', slug: 'custom-3', description: 'tier:subcategory | 备注' })).toBe('subcategory');
	});

	it('falls back to other for unrecognized custom categories without tier tag', () => {
		expect(getCategoryTier({ slug: 'limited-edition', name: 'Limited Edition' })).toBe('other');
	});

	it('groups database categories into 3 tiered rows correctly', () => {
		const dbCategories = [
			{ id: '1', slug: 'womens', name: 'Womens', sort_order: 0 },
			{ id: '2', slug: 'mens', name: 'Mens', sort_order: 0 },
			{ id: '3', slug: 'pants', name: 'Pants', sort_order: 0 },
			{ id: '4', slug: 'accessories', name: 'Accessories', sort_order: 1 },
			{ id: '5', slug: 'tops', name: 'Tops', sort_order: 1 },
			{ id: '6', slug: 'hoodies', name: 'Hoodies', sort_order: 2 },
			{ id: '7', slug: 'outerwear', name: 'Outerwear', sort_order: 3 },
			{ id: '8', slug: 'bottoms', name: 'Bottoms', sort_order: 20 },
			{ id: '9', slug: 'footwear', name: 'Footwear', sort_order: 40 },
			{ id: '10', slug: 'shoes', name: 'Shoes', sort_order: 50 }
		];

		const groups = groupCategoriesByHierarchy(dbCategories);
		expect(groups).toHaveLength(3);

		// Tier 1: Gender / Audience
		expect(groups[0].id).toBe('gender');
		expect(groups[0].label).toBe('一级类目');
		expect(groups[0].categories.map((c) => c.slug)).toEqual(['mens', 'womens']);

		// Tier 2: Primary Categories
		expect(groups[1].id).toBe('primary');
		expect(groups[1].label).toBe('二级类目');
		expect(groups[1].categories.map((c) => c.slug)).toEqual([
			'accessories',
			'tops',
			'outerwear',
			'bottoms',
			'footwear'
		]);

		// Tier 3: Subcategories
		expect(groups[2].id).toBe('subcategory');
		expect(groups[2].label).toBe('三级类目');
		expect(groups[2].categories.map((c) => c.slug)).toEqual(['pants', 'hoodies', 'shoes']);
	});

	it('sorts categories by Tier first, then by tier-specific sort order allowing same weights in different tiers', () => {
		const rawCategories = [
			{ id: 'sub-2', slug: 'hoodies', name: '连帽衫', sort_order: 2 },
			{ id: 'sub-1', slug: 't-shirts', name: 'T恤', sort_order: 1 },
			{ id: 'l2-2', slug: 'bottoms', name: '下装', sort_order: 2 },
			{ id: 'l2-1', slug: 'tops', name: '上装', sort_order: 1 },
			{ id: 'l1-2', slug: 'womens', name: '女士', sort_order: 2 },
			{ id: 'l1-1', slug: 'mens', name: '男士', sort_order: 1 },
			{ id: 'other-1', slug: 'custom-promo', name: '特惠专区', sort_order: 1 }
		];

		const sorted = sortCategoriesByHierarchy(rawCategories);
		expect(sorted.map((c) => `${c.slug}:${c.sort_order}`)).toEqual([
			// 一级类目 (sort_order 1, 2)
			'mens:1',
			'womens:2',
			// 二级类目 (sort_order 1, 2)
			'tops:1',
			'bottoms:2',
			// 三级类目 (sort_order 1, 2)
			't-shirts:1',
			'hoodies:2',
			// 其他类目 (sort_order 1)
			'custom-promo:1'
		]);
	});

	describe('calculateTierSortShifts', () => {
		it('shifts conflicting items forward when inserting new category at 1', () => {
			const existing = [
				{ id: 'a', sort_order: 1 },
				{ id: 'b', sort_order: 2 },
				{ id: 'c', sort_order: 3 }
			];
			const res = calculateTierSortShifts(existing, null, 1);
			expect(res.targetSortOrder).toBe(1);
			expect(res.shifts).toEqual([
				{ id: 'a', sort_order: 2 },
				{ id: 'b', sort_order: 3 },
				{ id: 'c', sort_order: 4 }
			]);
		});

		it('leaves items before insertion point unaffected', () => {
			const existing = [
				{ id: 'a', sort_order: 1 },
				{ id: 'b', sort_order: 2 },
				{ id: 'c', sort_order: 4 }
			];
			const res = calculateTierSortShifts(existing, null, 2);
			expect(res.targetSortOrder).toBe(2);
			expect(res.shifts).toEqual([
				{ id: 'b', sort_order: 3 }
			]);
		});

		it('does nothing if no collision exists', () => {
			const existing = [
				{ id: 'a', sort_order: 1 },
				{ id: 'b', sort_order: 2 }
			];
			const res = calculateTierSortShifts(existing, null, 5);
			expect(res.targetSortOrder).toBe(5);
			expect(res.shifts).toEqual([]);
		});

		it('does not shift when updating an item with unchanged sort_order', () => {
			const existing = [
				{ id: 'a', sort_order: 1 },
				{ id: 'b', sort_order: 2 }
			];
			const res = calculateTierSortShifts(existing, 'a', 1);
			expect(res.targetSortOrder).toBe(1);
			expect(res.shifts).toEqual([]);
		});

		it('shifts items when updating an item to a smaller conflicting sort_order', () => {
			const existing = [
				{ id: 'a', sort_order: 1 },
				{ id: 'b', sort_order: 2 },
				{ id: 'c', sort_order: 3 }
			];
			// Move 'c' from 3 to 1
			const res = calculateTierSortShifts(existing, 'c', 1);
			expect(res.targetSortOrder).toBe(1);
			expect(res.shifts).toEqual([
				{ id: 'a', sort_order: 2 },
				{ id: 'b', sort_order: 3 }
			]);
		});
	});
});


