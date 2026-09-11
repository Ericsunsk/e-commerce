import { describe, it, expect } from 'vitest';
import type { SectionType } from './models';

describe('content domain models', () => {
	it('should support valid section types including split_showcase', () => {
		const validTypes: SectionType[] = [
			'hero',
			'feature_split',
			'product_grid',
			'category_grid',
			'rich_text',
			'cta_banner',
			'split_showcase'
		];
		expect(validTypes).toHaveLength(7);
		expect(validTypes).toContain('split_showcase');
	});

	it('should allow structured settings with actions, items, and panels', () => {
		const settings = {
			reverse: true,
			align: 'center' as const,
			actions: [{ text: 'Shop', link: '/shop', style: 'primary' as const }],
			items: [{ title: 'Rings', link: '/shop?category=rings', imageUrl: 'https://example.com/ring.jpg' }],
			panels: [
				{ position: 'left' as const, title: 'Left Look', imageUrl: 'https://example.com/left.jpg' },
				{ position: 'right' as const, title: 'Right Look', imageUrl: 'https://example.com/right.jpg' }
			]
		};

		expect(settings.actions[0].text).toBe('Shop');
		expect(settings.items[0].title).toBe('Rings');
		expect(settings.panels).toHaveLength(2);
	});
});
