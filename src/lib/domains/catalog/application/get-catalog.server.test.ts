import { describe, it, expect, vi } from 'vitest';

/**
 * Application-layer tests for the checkout-facing product resolution.
 *
 * `resolveCheckoutProductWithClient` is the read path that decides what a
 * customer is charged, so its behaviour around `is_active` matters more than
 * any other read. The `isStorefrontVisible` predicate itself is covered in
 * `domain/product-visibility.test.ts`; what is tested here is when it is
 * applied.
 *
 * NOTE: this function is the ONLY product read path in the file that does not
 * call `isStorefrontVisible`/`filterVisibleProducts` — every other one does.
 * That may well be deliberate (a customer mid-checkout should not be blocked
 * because a product was deactivated in the last minute), but it has never been
 * asserted either way. These tests pin the current behaviour so the choice is
 * explicit; see the `deactivated product` case for what it currently does.
 */

vi.mock('$shared/infrastructure', () => ({
	Collections: {
		Products: 'products',
		Categories: 'categories',
		ProductVariants: 'product_variants'
	}
}));

vi.mock('$shared/infrastructure/server', () => ({
	withAdmin: <T>(fn: () => Promise<T>) => fn(),
	// Needed because the product mapper sanitizes `description` at its exit.
	// Kept as a pass-through so this test asserts resolution behaviour, not
	// sanitization (which has its own coverage in sanitize.server).
	sanitizeCmsHtml: (input: string | null | undefined) => input ?? ''
}));

vi.mock('../infrastructure/stripe-pricing.server', () => ({
	enrichProductWithStripe: (p: unknown) => Promise.resolve(p),
	enrichProductsBulk: (ps: unknown[]) => Promise.resolve(ps)
}));

import { resolveCheckoutProductWithClient } from './get-catalog.server';

function pbReturning(record: Record<string, unknown> | null) {
	return {
		collection: () => ({
			getFirstListItem: vi.fn().mockImplementation(async () => {
				if (!record) throw { status: 404 };
				return record;
			}),
			getList: vi.fn().mockResolvedValue({ items: [] })
		})
	} as never;
}

function productRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: 'prod_1',
		slug: 'test-product',
		title: 'Test Product',
		price: 1000,
		is_active: true,
		expand: { categories: [] },
		variants: [],
		...overrides
	};
}

describe('resolveCheckoutProductWithClient', () => {
	it('resolves an active product', async () => {
		const pb = pbReturning(productRecord());

		const resolved = await resolveCheckoutProductWithClient(pb, 'prod_1');

		expect(resolved).toBeDefined();
		expect(resolved?.recordId).toBe('prod_1');
	});

	it('returns undefined for a missing product', async () => {
		const pb = pbReturning(null);

		await expect(resolveCheckoutProductWithClient(pb, 'nope')).resolves.toBeUndefined();
	});

	it('resolves a DEACTIVATED product', async () => {
		// Pinned deliberately. Unlike every other read path, this one does not
		// filter on is_active, so a product deactivated after a customer opened
		// checkout can still be purchased. Whether that is intended is an open
		// question — this test exists so changing it is a conscious act rather
		// than a silent side effect of "make the read paths consistent".
		const pb = pbReturning(productRecord({ is_active: false }));

		const resolved = await resolveCheckoutProductWithClient(pb, 'prod_1');

		expect(resolved).toBeDefined();
	});
});
