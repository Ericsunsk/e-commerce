import { describe, it, expect } from 'vitest';
import { parsePrice, priceToCents, centsToDollars, formatCurrency } from './price';

describe('price utilities', () => {
	it('should parse formatted price strings correctly', () => {
		expect(parsePrice('$99.00')).toBe(99);
		expect(parsePrice('129.50')).toBe(129.5);
		expect(parsePrice(45.99)).toBe(45.99);
		expect(parsePrice(null)).toBe(0);
		expect(parsePrice(undefined)).toBe(0);
	});

	it('should convert price strings to cents', () => {
		expect(priceToCents('$99.00')).toBe(9900);
		expect(priceToCents('19.99')).toBe(1999);
		expect(priceToCents(50)).toBe(5000);
	});

	it('should convert cents to dollars', () => {
		expect(centsToDollars(9900)).toBe(99);
		expect(centsToDollars(1999)).toBe(19.99);
	});

	it('should format currency correctly', () => {
		expect(formatCurrency(99, { currency: 'USD', locale: 'en-US' })).toBe('$99.00');
		expect(formatCurrency(9900, { currency: 'USD', locale: 'en-US', isCents: true })).toBe(
			'$99.00'
		);
	});
});
