import { describe, it, expect } from 'vitest';
import type { SectionType } from './models';

describe('content domain models', () => {
	it('should support valid section types', () => {
		const validTypes: SectionType[] = [
			'hero',
			'feature_split',
			'product_grid',
			'category_grid',
			'rich_text',
			'cta_banner'
		];
		expect(validTypes).toHaveLength(6);
	});
});
