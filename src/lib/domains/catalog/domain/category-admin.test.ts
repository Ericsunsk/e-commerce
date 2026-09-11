import { describe, it, expect } from 'vitest';
import { normalizeCategory, slugify, toCategoryRow } from './category-admin';

describe('category admin model', () => {
	it('validates payloads and derives slugs', () => {
		expect(normalizeCategory({ name: '男装', slug: 'mens' })).toMatchObject({
			name: '男装',
			slug: 'mens',
			is_visible: true
		});
		const autoNorm = normalizeCategory({ name: '夏季特惠', tier: 'primary', sort_order: 1 });
		expect(autoNorm.name).toBe('夏季特惠');
		expect(autoNorm.tier).toBe('primary');
		expect(autoNorm.slug).toMatch(/^l2-/);
		expect(autoNorm.description).toContain('tier:primary');
		expect(autoNorm.sort_order).toBe(1);
		expect(slugify('Summer Sale 2026')).toBe('summer-sale-2026');
		expect(slugify('男装')).toBe('category');
		for (const bad of [
			null,
			{ name: 'x' },
			{ name: 'ok', slug: 'BAD SLUG' },
			{ name: 'ok', sort_order: -1 }
		]) {
			try {
				normalizeCategory(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('projects rows with counts', () => {
		expect(
			toCategoryRow({ id: 'c1', name: 'T恤', slug: 'tees', sort_order: 2, is_visible: false }, 5)
		).toMatchObject({ productCount: 5, isActive: false, sortOrder: 2 });
	});
});
