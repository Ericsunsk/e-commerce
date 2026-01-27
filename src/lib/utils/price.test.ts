import { describe, it, expect } from 'vitest';
import { parsePrice, priceToCents, centsToDollars, formatCurrency } from './price';

describe('Price Utilities', () => {
    it('parsePrice should extract number from currency string', () => {
        expect(parsePrice('$99.00')).toBe(99);
        expect(parsePrice('€123.45')).toBe(123.45);
        expect(parsePrice('abc')).toBe(0);
    });

    it('priceToCents should convert price string to cents', () => {
        expect(priceToCents('$99.00')).toBe(9900);
        expect(priceToCents('$10.50')).toBe(1050);
    });

    it('centsToDollars should convert cents to dollars', () => {
        expect(centsToDollars(9900)).toBe(99);
        expect(centsToDollars(1050)).toBe(10.5);
    });

    it('formatCurrency should format correctly', () => {
        expect(formatCurrency(100)).toBe('$100.00');
        expect(formatCurrency(1000, { isCents: true })).toBe('$10.00');
        expect(formatCurrency(50, { currency: 'EUR', locale: 'de-DE' })).toMatch(/50,00\s€/); // Matching format flexibly
    });
});
