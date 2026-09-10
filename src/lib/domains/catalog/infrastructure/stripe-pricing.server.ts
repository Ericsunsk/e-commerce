import type Stripe from 'stripe';
import { DEFAULTS, formatCurrency } from '$shared/kernel';
import { getStripeClient, getPaymentConfig, isTestMode } from '$domains/payment/server';
import type { Product } from '../domain/models';

/** Resolve the dynamic client, or null when no secret is configured (dev fallback). */
async function stripeClient(): Promise<Stripe | null> {
	try {
		return await getStripeClient();
	} catch {
		return null;
	}
}

/** True when the effective config carries a real (non-placeholder) secret. */
async function hasLiveSecret(): Promise<boolean> {
	try {
		const config = await getPaymentConfig();
		return !isTestMode(config);
	} catch {
		return false;
	}
}

type StripeResolvedPrice = {
	formatted: string;
	value: number;
};

type StripePriceCacheEntry = {
	data: StripeResolvedPrice;
	expires: number;
};

const priceCache = new Map<string, StripePriceCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache
export const STRIPE_TEST_FALLBACK_PRICE_VALUE = 195;
const STRIPE_TEST_FALLBACK_PRICE = `${DEFAULTS.currencySymbol}${STRIPE_TEST_FALLBACK_PRICE_VALUE.toFixed(2)}`;

function getStripeTestFallbackPrice(): StripeResolvedPrice {
	return {
		formatted: STRIPE_TEST_FALLBACK_PRICE,
		value: STRIPE_TEST_FALLBACK_PRICE_VALUE
	};
}

export async function fetchStripePrice(stripeId?: string): Promise<StripeResolvedPrice> {
	if (!stripeId) return { formatted: `${DEFAULTS.currencySymbol}0.00`, value: 0 };

	const cached = priceCache.get(stripeId);
	if (cached && Date.now() < cached.expires) {
		return cached.data;
	}

	if (stripeId.includes('TEST') || stripeId.includes('placeholder') || stripeId.includes('mock')) {
		return getStripeTestFallbackPrice();
	}

	const stripe = await stripeClient();
	if (!stripe || !(await hasLiveSecret())) {
		return getStripeTestFallbackPrice();
	}

	try {
		let priceValue = 0;
		let currency = 'usd';

		if (stripeId.startsWith('price_')) {
			try {
				const price = await stripe.prices.retrieve(stripeId);
				priceValue = price.unit_amount || 0;
				currency = price.currency;
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : String(e);
				if (!message.includes('No such price')) {
					console.warn(
						`⚠️ Stripe price lookup failed for ${stripeId}: ${message}. Using fallback.`
					);
				}
				if (message.includes('No such price')) {
					return getStripeTestFallbackPrice();
				}
				return { formatted: 'N/A', value: 0 };
			}
		} else if (stripeId.startsWith('prod_')) {
			const product = await stripe.products.retrieve(stripeId);
			if (typeof product.default_price === 'string') {
				const price = await stripe.prices.retrieve(product.default_price);
				priceValue = price.unit_amount || 0;
				currency = price.currency;
			} else if (product.default_price && typeof product.default_price === 'object') {
				const expandedPrice = product.default_price as Stripe.Price;
				priceValue = expandedPrice.unit_amount || 0;
				currency = expandedPrice.currency || 'usd';
			}
		}

		const result = {
			formatted: formatCurrency(priceValue, { currency, isCents: true }),
			value: priceValue / 100
		};

		priceCache.set(stripeId, {
			data: result,
			expires: Date.now() + CACHE_TTL_MS
		});

		return result;
	} catch (e: unknown) {
		const err = e as { type?: string; message: string };
		if (err?.type !== 'StripeAuthenticationError') {
			console.error(`Failed to fetch Stripe price for ${stripeId}:`, err.message);
		}
		return getStripeTestFallbackPrice();
	}
}

export async function fetchStripePricesBulk(
	stripeIds: string[]
): Promise<Map<string, StripeResolvedPrice>> {
	if (stripeIds.length === 0) return new Map();

	const result = new Map<string, StripeResolvedPrice>();
	const idsToFetch: string[] = [];

	for (const id of stripeIds) {
		const cached = priceCache.get(id);
		if (cached && Date.now() < cached.expires) {
			result.set(id, cached.data);
		} else {
			idsToFetch.push(id);
		}
	}

	if (idsToFetch.length === 0) return result;

	const stripe = await stripeClient();
	if (!stripe || !(await hasLiveSecret())) {
		idsToFetch.forEach((id) => {
			const mock = getStripeTestFallbackPrice();
			result.set(id, mock);
			priceCache.set(id, { data: mock, expires: Date.now() + CACHE_TTL_MS });
		});
		return result;
	}

	try {
		const CHUNK_SIZE = 10;
		const chunks = [];
		for (let i = 0; i < idsToFetch.length; i += CHUNK_SIZE) {
			chunks.push(idsToFetch.slice(i, i + CHUNK_SIZE));
		}

		for (const chunk of chunks) {
			const chunkPromises = chunk.map(async (id) => {
				try {
					let priceValue = 0;
					let currency = 'usd';

					if (id.startsWith('price_')) {
						const price = await stripe.prices.retrieve(id);
						priceValue = price.unit_amount || 0;
						currency = price.currency;
					} else if (id.startsWith('prod_')) {
						const product = await stripe.products.retrieve(id, { expand: ['default_price'] });

						if (product.default_price && typeof product.default_price === 'object') {
							const p = product.default_price as Stripe.Price;
							priceValue = p.unit_amount || 0;
							currency = p.currency || 'usd';
						} else if (typeof product.default_price === 'string') {
							const price = await stripe.prices.retrieve(product.default_price);
							priceValue = price.unit_amount || 0;
							currency = price.currency;
						}
					} else {
						return null;
					}

					const data = {
						formatted: formatCurrency(priceValue, { currency, isCents: true }),
						value: priceValue / 100
					};
					return { id, data };
				} catch {
					return null;
				}
			});

			const results = await Promise.all(chunkPromises);

			results.forEach((res) => {
				if (res) {
					result.set(res.id, res.data);
					priceCache.set(res.id, { data: res.data, expires: Date.now() + CACHE_TTL_MS });
				}
			});
		}
	} catch (e: unknown) {
		console.error('Bulk Stripe Fetch Error:', e instanceof Error ? e.message : String(e));
	}

	for (const id of idsToFetch) {
		if (!result.has(id)) {
			const single = await fetchStripePrice(id);
			result.set(id, single);
		}
	}

	return result;
}

export async function enrichProductWithStripe(product: Product): Promise<Product> {
	if (product.stripePriceId) {
		const { formatted, value } = await fetchStripePrice(product.stripePriceId);
		if (value > 0) {
			return { ...product, price: formatted, priceValue: value };
		}
	}
	return product;
}

export async function enrichProductsBulk(products: Product[]): Promise<Product[]> {
	const stripeIds = products.map((p) => p.stripePriceId).filter((id): id is string => !!id);
	const priceMap = await fetchStripePricesBulk(stripeIds);
	// Test mode = no live secret (fallback pricing stays visible, zero-price rows drop).
	let testMode = true;
	try {
		testMode = isTestMode(await getPaymentConfig());
	} catch {
		// Unreachable config → keep fallback behavior.
	}

	return products
		.map((p) => {
			if (p.stripePriceId && priceMap.has(p.stripePriceId)) {
				const { formatted, value } = priceMap.get(p.stripePriceId)!;
				if (value > 0) {
					return { ...p, price: formatted, priceValue: value };
				}
				if (testMode && value === 0) {
					return null;
				}
			}
			return p;
		})
		.filter((p): p is Product => p !== null);
}
