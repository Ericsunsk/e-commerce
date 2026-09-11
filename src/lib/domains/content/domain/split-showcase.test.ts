import { describe, it, expect } from 'vitest';
import { resolveSplitShowcase } from './split-showcase';
import type { UISection } from './models';

describe('resolveSplitShowcase', () => {
	it('returns defaults when section is null or undefined', () => {
		const result = resolveSplitShowcase(null);
		expect(result.heading).toBe('GLAMOURIA');
		expect(result.subheading).toBe('Shop Now');
		expect(result.panels).toEqual([]);
	});

	it('resolves panels configured in settings.panels', () => {
		const mockSection = {
			id: 'sec-1',
			heading: 'SUMMER CAPSULE',
			subheading: 'Explore Now',
			settings: {
				panels: [
					{
						position: 'left' as const,
						title: 'Womenswear',
						link: '/shop?gender=womens',
						imageUrl: 'https://example.com/women.jpg'
					},
					{
						position: 'right' as const,
						title: 'Menswear',
						link: '/shop?gender=mens',
						imageUrl: 'https://example.com/men.jpg'
					}
				]
			}
		} as unknown as UISection;

		const result = resolveSplitShowcase(mockSection);
		expect(result.heading).toBe('SUMMER CAPSULE');
		expect(result.subheading).toBe('Explore Now');
		expect(result.panels).toHaveLength(2);
		expect(result.panels[0]).toEqual({
			id: 'left-0',
			position: 'left',
			title: 'Womenswear',
			link: '/shop?gender=womens',
			image: 'https://example.com/women.jpg'
		});
		expect(result.panels[1]).toEqual({
			id: 'right-1',
			position: 'right',
			title: 'Menswear',
			link: '/shop?gender=mens',
			image: 'https://example.com/men.jpg'
		});
	});

	it('falls back to imageGallery and actions when panels is not configured', () => {
		const mockSection = {
			id: 'sec-2',
			heading: 'GLAMOURIA',
			imageGallery: ['https://example.com/left.jpg', 'https://example.com/right.jpg'],
			settings: {
				actions: [
					{ text: 'Shop Left', link: '/left' },
					{ text: 'Shop Right', link: '/right' }
				]
			}
		} as unknown as UISection;

		const result = resolveSplitShowcase(mockSection);
		expect(result.heading).toBe('GLAMOURIA');
		expect(result.panels).toHaveLength(2);
		expect(result.panels[0].image).toBe('https://example.com/left.jpg');
		expect(result.panels[0].title).toBe('Shop Left');
		expect(result.panels[1].image).toBe('https://example.com/right.jpg');
		expect(result.panels[1].title).toBe('Shop Right');
	});

	it('filters out panels with empty or whitespace imageUrls', () => {
		const mockSection = {
			id: 'sec-3',
			settings: {
				panels: [
					{ position: 'left' as const, title: 'Valid', imageUrl: 'https://example.com/valid.jpg' },
					{ position: 'right' as const, title: 'Empty', imageUrl: '   ' }
				]
			}
		} as unknown as UISection;

		const result = resolveSplitShowcase(mockSection);
		expect(result.panels).toHaveLength(1);
		expect(result.panels[0].title).toBe('Valid');
	});
});
