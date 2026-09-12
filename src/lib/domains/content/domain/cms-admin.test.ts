import { describe, it, expect } from 'vitest';
import {
	normalizePageInput,
	normalizeNavInput,
	toPageRow,
	toNavRow,
	normalizeSectionInput,
	toSectionRow,
	swapSectionRank,
	buildSectionSettings
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
		expect(() => normalizeSectionInput({ page: 'p1', type: 'invalid_type_unknown' })).toThrow();
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

describe('buildSectionSettings', () => {
	it('drops blank action rows but keeps partially filled ones', () => {
		const out = buildSectionSettings({
			settingsRest: {},
			externalRest: {},
			actions: [
				{ text: 'Shop', link: '/shop' },
				{ text: '', link: '' }, // blank → dropped
				{ text: 'Only label', link: '' }, // partial → kept
				{ text: '', link: '/only-link' } // partial → kept
			],
			externalImageUrl: ''
		});

		expect(out.validActions).toHaveLength(3);
		expect(out.validActions[0]).toEqual({ text: 'Shop', link: '/shop' });
	});

	it('treats whitespace-only action rows as blank', () => {
		const out = buildSectionSettings({
			settingsRest: {},
			externalRest: {},
			actions: [{ text: '   ', link: '  ' }],
			externalImageUrl: ''
		});

		expect(out.validActions).toEqual([]);
	});

	it('sets external.image_url when an image URL is given', () => {
		const out = buildSectionSettings({
			settingsRest: {},
			externalRest: {},
			actions: [],
			externalImageUrl: '  https://cdn.example/a.jpg  '
		});

		expect(out.imageUrl).toBe('https://cdn.example/a.jpg');
		expect((out.settings.external as Record<string, unknown>).image_url).toBe(
			'https://cdn.example/a.jpg'
		);
	});

	it('DELETES image_url rather than blanking it when the field is cleared', () => {
		// The meaningful case: setting '' would leave a reference pointing at
		// nothing, instead of removing it. Clearing must remove the key.
		const out = buildSectionSettings({
			settingsRest: {},
			externalRest: { image_url: 'https://old.example/x.jpg', other: 1 },
			actions: [],
			externalImageUrl: ''
		});

		const external = out.settings.external as Record<string, unknown>;
		expect('image_url' in external).toBe(false);
		// Sibling external fields survive.
		expect(external.other).toBe(1);
	});

	it('omits the external bag entirely when it would be empty', () => {
		const out = buildSectionSettings({
			settingsRest: {},
			externalRest: {},
			actions: [],
			externalImageUrl: ''
		});

		expect('external' in out.settings).toBe(false);
	});

	it('carries unsurfaced settings fields through untouched', () => {
		const out = buildSectionSettings({
			settingsRest: { heading_size: 'lg', layout: 'grid' },
			externalRest: {},
			actions: [],
			externalImageUrl: ''
		});

		expect(out.settings.heading_size).toBe('lg');
		expect(out.settings.layout).toBe('grid');
		// actions is always present, even when empty.
		expect(out.settings.actions).toEqual([]);
	});

	it('does not mutate the rest bags it is given', () => {
		const externalRest = { image_url: 'https://old.example/x.jpg' };
		buildSectionSettings({
			settingsRest: {},
			externalRest,
			actions: [],
			externalImageUrl: ''
		});

		expect(externalRest.image_url).toBe('https://old.example/x.jpg');
	});
});
