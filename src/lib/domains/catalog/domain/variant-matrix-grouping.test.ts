import { describe, it, expect } from 'vitest';
import {
	colorKeyOf,
	colorLabelOf,
	groupRowsByColor,
	collectGalleryUnionByColor,
	needsGalleryNormalization,
	normalizeGalleriesByColor,
	UNNAMED_COLOR_LABEL
} from './variant-matrix';

/**
 * Grouping tests for the variant matrix editor.
 *
 * Extracted from `_VariantMatrix.svelte`, where these transformations were
 * `$derived`/`$effect` blocks reachable only by driving the component. The
 * gallery convergence in particular had subtle intent — "every row of a colour
 * carries the union so saves round-trip without divergence" — that was only
 * expressed as a comment next to an `$effect`.
 */

function v(
	over: Partial<{
		color: string;
		size: string;
		sku: string;
		stockQuantity: number;
		gallery?: string[];
		colorSwatch?: string;
	}> = {}
) {
	return {
		color: 'Red',
		size: 'M',
		sku: 'SKU-1',
		stockQuantity: 1,
		...over
	};
}

describe('colorKeyOf', () => {
	it('normalises case and surrounding whitespace', () => {
		// A stray space must not split one colour into two swatches.
		expect(colorKeyOf({ color: 'Red' })).toBe(colorKeyOf({ color: '  red ' }));
		expect(colorKeyOf({ color: 'RED' })).toBe('red');
	});

	it('falls back to a single unnamed group for blank colours', () => {
		expect(colorKeyOf({ color: '' })).toBe(UNNAMED_COLOR_LABEL);
		expect(colorKeyOf({ color: '   ' })).toBe(UNNAMED_COLOR_LABEL);
		expect(colorKeyOf({})).toBe(UNNAMED_COLOR_LABEL);
	});
});

describe('colorLabelOf', () => {
	it('trims but preserves the original casing', () => {
		expect(colorLabelOf({ color: '  Crimson  ' })).toBe('Crimson');
	});

	it('uses the placeholder for blank', () => {
		expect(colorLabelOf({ color: '  ' })).toBe(UNNAMED_COLOR_LABEL);
	});
});

describe('groupRowsByColor', () => {
	it('groups rows by normalised colour, preserving first-seen order', () => {
		const rows = [
			v({ color: 'Red', size: 'S' }),
			v({ color: 'Blue', size: 'S' }),
			v({ color: 'red', size: 'M' })
		];

		const groups = groupRowsByColor(rows);

		expect(groups.map((g) => g.key)).toEqual(['red', 'blue']);
		expect(groups[0].entries.map((e) => e.row.size)).toEqual(['S', 'M']);
	});

	it("keeps each entry's original index so edits can be written back", () => {
		const rows = [
			v({ color: 'Red' }), // 0
			v({ color: 'Blue' }), // 1
			v({ color: 'Red' }) // 2
		];

		const groups = groupRowsByColor(rows);

		expect(groups[0].entries.map((e) => e.index)).toEqual([0, 2]);
		expect(groups[1].entries.map((e) => e.index)).toEqual([1]);
	});

	it('collects every distinct gallery filename into the group, in order', () => {
		const rows = [
			v({ color: 'Red', gallery: ['a.jpg', 'b.jpg'] }),
			v({ color: 'red', gallery: ['b.jpg', 'c.jpg'] })
		];

		expect(groupRowsByColor(rows)[0].gallery).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
	});

	it('takes the first swatch available in the group', () => {
		const rows = [
			v({ color: 'Red' }),
			v({ color: 'Red', colorSwatch: '#f00' }),
			v({ color: 'Red', colorSwatch: '#b00' })
		];

		expect(groupRowsByColor(rows)[0].colorSwatch).toBe('#f00');
	});

	it('sums stock across the group', () => {
		const rows = [v({ color: 'Red', stockQuantity: 3 }), v({ color: 'Red', stockQuantity: 4 })];

		expect(groupRowsByColor(rows)[0].stockTotal).toBe(7);
	});

	it('treats a missing stock value as zero rather than NaN', () => {
		const rows = [
			v({ color: 'Red', stockQuantity: undefined as unknown as number }),
			v({ color: 'Red', stockQuantity: 2 })
		];

		expect(groupRowsByColor(rows)[0].stockTotal).toBe(2);
	});

	it('returns an empty array for no rows', () => {
		expect(groupRowsByColor([])).toEqual([]);
	});
});

describe('collectGalleryUnionByColor', () => {
	it('keys the union by normalised colour', () => {
		const union = collectGalleryUnionByColor([
			{ color: 'Red', gallery: ['a.jpg'] },
			{ color: 'RED', gallery: ['b.jpg'] }
		]);

		expect(union.get('red')).toEqual(['a.jpg', 'b.jpg']);
	});

	it('gives a colour with no gallery an empty list', () => {
		const union = collectGalleryUnionByColor([{ color: 'Red' }]);
		expect(union.get('red')).toEqual([]);
	});
});

describe('needsGalleryNormalization', () => {
	it('is false when every row already carries the full union', () => {
		const rows = [
			{ color: 'Red', gallery: ['a.jpg', 'b.jpg'] },
			{ color: 'red', gallery: ['b.jpg', 'a.jpg'] } // same set, different order
		];

		// Order must not matter — otherwise the editor would "fix" this forever.
		expect(needsGalleryNormalization(rows)).toBe(false);
	});

	it('is true when a row is missing a sibling gallery item', () => {
		const rows = [
			{ color: 'Red', gallery: ['a.jpg', 'b.jpg'] },
			{ color: 'Red', gallery: ['a.jpg'] }
		];

		expect(needsGalleryNormalization(rows)).toBe(true);
	});

	it('is true when a row has an extra item not in the union', () => {
		const rows = [
			{ color: 'Red', gallery: ['a.jpg'] },
			{ color: 'Red', gallery: [] }
		];

		expect(needsGalleryNormalization(rows)).toBe(true);
	});

	it('is false for a single row', () => {
		expect(needsGalleryNormalization([{ color: 'Red', gallery: ['a.jpg'] }])).toBe(false);
	});

	it('treats rows with no gallery as already converged', () => {
		expect(needsGalleryNormalization([{ color: 'Red' }, { color: 'Red' }])).toBe(false);
	});
});

describe('normalizeGalleriesByColor', () => {
	it('replaces every gallery with its colour union, sorted', () => {
		const rows = [
			{ color: 'Red', gallery: ['b.jpg'] },
			{ color: 'Red', gallery: ['a.jpg'] }
		];

		const out = normalizeGalleriesByColor(rows);

		expect(out[0].gallery).toEqual(['a.jpg', 'b.jpg']);
		expect(out[1].gallery).toEqual(['a.jpg', 'b.jpg']);
	});

	it('does not mutate the input rows', () => {
		const rows = [
			{ color: 'Red', gallery: ['b.jpg'] },
			{ color: 'Red', gallery: ['a.jpg'] }
		];
		normalizeGalleriesByColor(rows);
		expect(rows[0].gallery).toEqual(['b.jpg']);
	});

	it('leaves other fields alone', () => {
		const rows = [{ color: 'Red', gallery: [] as string[], sku: 'SKU-9' }];
		expect(normalizeGalleriesByColor(rows)[0].sku).toBe('SKU-9');
	});

	it('is idempotent — normalising twice changes nothing', () => {
		const rows = [
			{ color: 'Red', gallery: ['b.jpg'] },
			{ color: 'Red', gallery: ['a.jpg'] }
		];

		const once = normalizeGalleriesByColor(rows);
		const twice = normalizeGalleriesByColor(once);

		expect(twice).toEqual(once);
		// And after normalising, nothing more is needed.
		expect(needsGalleryNormalization(once)).toBe(false);
	});
});
