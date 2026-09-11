import { describe, it, expect } from 'vitest';
import {
	generateSku,
	sanitizeSkuSegment,
	generateVariantMatrix,
	adjustStock,
	DEFAULT_SIZE_PRESETS,
	DEFAULT_COLOR_PRESETS
} from './variant-matrix';

describe('variant-matrix domain logic', () => {
	it('sanitizes SKU segments consistently', () => {
		expect(sanitizeSkuSegment('linen-shirt-2026', 'DEF')).toBe('LINEN-SHIRT-2026');
		expect(sanitizeSkuSegment('   Café Noir  ', 'DEF')).toBe('CAFE-NOIR');
		expect(sanitizeSkuSegment('!@#$%^', 'DEF')).toBe('DEF');
	});

	it('generates standard SKU using slug, color, and size', () => {
		expect(generateSku('linen-shirt', '曜石黑', 'L', 'BLK')).toBe('LINEN-SHIRT-BLK-L');
		expect(generateSku('silk-scarf', 'Red', 'M')).toBe('SILK-SCARF-RED-M');
		expect(generateSku('', '', '')).toBe('PROD-CLR-STD');
	});

	it('generates combinatorial variant matrix correctly', () => {
		const variants = generateVariantMatrix({
			productSlug: 'tee-shirt',
			colors: [
				{ name: '曜石黑', slug: 'BLK', swatch: '#18181b' },
				{ name: '珍珠白', slug: 'WHT', swatch: '#ffffff' }
			],
			sizes: ['S', 'M', 'L'],
			defaultStock: 25
		});

		expect(variants).toHaveLength(6);
		expect(variants[0]).toEqual({
			color: '曜石黑',
			colorSwatch: '#18181b',
			size: 'S',
			sku: 'TEE-SHIRT-BLK-S',
			stockQuantity: 25
		});
		expect(variants[5]).toEqual({
			color: '珍珠白',
			colorSwatch: '#ffffff',
			size: 'L',
			sku: 'TEE-SHIRT-WHT-L',
			stockQuantity: 25
		});
	});

	it('handles empty colors or sizes gracefully', () => {
		const withOnlySizes = generateVariantMatrix({
			productSlug: 'hat',
			colors: [],
			sizes: ['S', 'M']
		});
		expect(withOnlySizes).toHaveLength(2);
		expect(withOnlySizes[0].color).toBe('标准色');

		const withOnlyColors = generateVariantMatrix({
			productSlug: 'bag',
			colors: [{ name: 'Black', slug: 'BLK' }],
			sizes: []
		});
		expect(withOnlyColors).toHaveLength(1);
		expect(withOnlyColors[0].size).toBe('ONE SIZE');

		const completelyEmpty = generateVariantMatrix({
			productSlug: 'test',
			colors: [],
			sizes: []
		});
		expect(completelyEmpty).toHaveLength(0);
	});

	it('adjusts stock safely preventing negatives', () => {
		expect(adjustStock(10, 5)).toBe(15);
		expect(adjustStock(10, -5)).toBe(5);
		expect(adjustStock(5, -10)).toBe(0);
		expect(adjustStock(0, -1)).toBe(0);
		expect(adjustStock(NaN, 5)).toBe(5);
	});

	it('provides comprehensive presets', () => {
		expect(DEFAULT_SIZE_PRESETS).toContain('M');
		expect(DEFAULT_SIZE_PRESETS).toContain('ONE SIZE');
		expect(DEFAULT_COLOR_PRESETS.length).toBeGreaterThanOrEqual(6);
		expect(DEFAULT_COLOR_PRESETS[0]).toHaveProperty('swatch');
	});
});
