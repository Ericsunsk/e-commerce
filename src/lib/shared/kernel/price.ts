/**
 * Price Utilities
 * Unified price parsing, calculation, and currency formatting tools
 */

/**
 * Parse numeric amount from a price string (e.g. "$99.00" → 99)
 */
export function parsePrice(priceString: string | number | undefined | null): number {
	if (typeof priceString === 'number') return priceString;
	if (typeof priceString !== 'string') return 0;
	const clean = priceString.replace(/[^0-9.-]/g, '');
	return parseFloat(clean) || 0;
}

/**
 * Convert price to cents (integer) for Stripe
 * "$99.00" → 9900
 */
export function priceToCents(priceString: string | number): number {
	return Math.round(parsePrice(priceString) * 100);
}

/**
 * Convert cents to dollars
 * 9900 → 99.00
 */
export function centsToDollars(cents: number): number {
	return cents / 100;
}

/**
 * Format currency amount with locale support
 */
export function formatCurrency(
	amount: number,
	options: {
		currency?: string;
		locale?: string;
		isCents?: boolean;
	} = {}
): string {
	const { currency = 'USD', locale = 'en-US', isCents = false } = options;
	const value = isCents ? amount / 100 : amount;

	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currency.toUpperCase()
		}).format(value);
	} catch {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: 'USD'
		}).format(value);
	}
}
