import { describe, it, expect } from 'vitest';
import {
	normalizePageInput,
	normalizeNavInput,
	toPageRow,
	toNavRow,
	normalizeSectionInput,
	toSectionRow,
	swapSectionRank
} from './cms-admin';

describe('cms admin model', () => {
	it('validates page payloads', () => {
		expect(
			normalizePageInput({ slug: ' About-Us ', title: '关于我们', content: '<p>x</p>' })
		).toMatchObject({ slug: 'about-us', title: '关于我们' });
		for (const bad of [
			null,
			{ slug: 'BAD SLUG', title: 'x' },
			{ slug: 'ok', title: 'x' },
			{ slug: 'ok', title: '' }
		]) {
			try {
				normalizePageInput(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('validates nav payloads', () => {
		expect(
			normalizeNavInput({ label: '首页', url: '/', location: 'header', order: 1 })
		).toMatchObject({ label: '首页', url: '/', location: 'header', is_visible: true });
		for (const bad of [
			null,
			{ label: '', url: '/' },
			{ label: 'x', url: 'notaurl' },
			{ label: 'x', url: '/', location: 'sidebar' },
			{ label: 'x', url: '/', order: -1 }
		]) {
			try {
				normalizeNavInput(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('projects rows', () => {
		expect(toPageRow({ id: 'p1', slug: 'about', updated: '2026-01-01' })).toMatchObject({
			slug: 'about',
			title: ''
		});
		expect(toNavRow({ id: 'n1', label: '首页', url: '/', is_visible: false })).toMatchObject({
			isActive: false,
			location: 'header',
			order: 0
		});
		expect(
			toSectionRow({
				id: 's1',
				page: 'p1',
				type: 'split_showcase',
				heading: 'Glamour',
				sort_order: 20,
				is_active: true,
				image: ['img1.jpg', 'img2.jpg']
			})
		).toMatchObject({
			id: 's1',
			pageId: 'p1',
			type: 'split_showcase',
			heading: 'Glamour',
			sortOrder: 20,
			isActive: true,
			imageCount: 2
		});
	});

	it('validates section payloads', () => {
		expect(
			normalizeSectionInput({
				page: 'p1',
				type: 'split_showcase',
				heading: 'Summer 2027',
				settings: { reverse: true }
			})
		).toMatchObject({
			page: 'p1',
			type: 'split_showcase',
			heading: 'Summer 2027',
			is_active: true,
			settings: { reverse: true }
		});

		// Rejects invalid type
		expect(() =>
			normalizeSectionInput({ page: 'p1', type: 'invalid_type_unknown' })
		).toThrow();
	});

	it('swaps a section with its neighbour', () => {
		const rows = [
			{ id: 'a', sortOrder: 10 },
			{ id: 'b', sortOrder: 20 },
			{ id: 'c', sortOrder: 30 }
		];
		expect(swapSectionRank(rows, 'b', -1)).toEqual([
			{ id: 'b', sortOrder: 10 },
			{ id: 'a', sortOrder: 20 }
		]);
		expect(swapSectionRank(rows, 'b', 1)).toEqual([
			{ id: 'b', sortOrder: 30 },
			{ id: 'c', sortOrder: 20 }
		]);
		// Out of bounds
		expect(swapSectionRank(rows, 'a', -1)).toBeNull();
		expect(swapSectionRank(rows, 'c', 1)).toBeNull();
		expect(swapSectionRank(rows, 'missing', 1)).toBeNull();
		// Equal ranks nudge apart deterministically
		expect(
			swapSectionRank(
				[
					{ id: 'a', sortOrder: 10 },
					{ id: 'b', sortOrder: 10 }
				],
				'a',
				1
			)
		).toEqual([
			{ id: 'a', sortOrder: 11 },
			{ id: 'b', sortOrder: 10 }
		]);
	});
});
