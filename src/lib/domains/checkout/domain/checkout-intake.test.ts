import { describe, it, expect, vi } from 'vitest';
import {
	createCheckoutSession,
	normalizeIntakeRequest,
	chunkMetadata,
	resolveShippingCents,
	IntakeError,
	type IntakePorts,
	type IntakeProduct
} from './checkout-intake';

function product(overrides: Partial<IntakeProduct> = {}): IntakeProduct {
	return {
		title: 'Tee',
		priceValue: 50,
		image: 'img.jpg',
		hasVariants: false,
		stockStatus: 'in_stock',
		...overrides
	};
}

function ports(overrides: Partial<IntakePorts> = {}): IntakePorts & {
	stripe: IntakePorts['stripe'] & {
		createPaymentIntent: ReturnType<typeof vi.fn>;
	};
} {
	const base: IntakePorts = {
		catalog: {
			resolveProduct: async (id: string) => ({ recordId: `rec-${id}`, product: product() })
		},
		discount: {
			applyCoupon: async () => ({ valid: false, discountCents: 0 })
		},
		stripe: {
			getOrCreateCustomer: vi.fn().mockResolvedValue('cus_123'),
			calculateTax: vi.fn().mockResolvedValue({ taxAmountCents: 0, calculationId: null }),
			createPaymentIntent: vi.fn().mockResolvedValue({ clientSecret: 'secret_123' })
		},
		customer: {
			findStoredCustomerId: vi.fn().mockResolvedValue(null),
			persistCustomerId: vi.fn().mockResolvedValue(undefined),
			findCartRecordId: vi.fn().mockResolvedValue('')
		},
		...overrides
	};
	return base as ReturnType<typeof ports>;
}

describe('checkout intake', () => {
	it('creates a session with verified catalog prices and shipping', async () => {
		const p = ports();
		const result = await createCheckoutSession(p, {
			items: [{ id: 'p1', quantity: 2 }],
			shippingOptionId: 'express'
		});

		expect(result.subtotalAmount).toBe(100);
		expect(result.shippingAmount).toBe(25);
		expect(result.totalAmount).toBe(125);
		expect(result.clientSecret).toBe('secret_123');
		expect(p.stripe.createPaymentIntent).toHaveBeenCalledWith(
			expect.objectContaining({ amount: 12500, currency: 'usd' })
		);
	});

	it('applies percentage and fixed discounts, capped at subtotal', async () => {
		const withPercent = ports({
			discount: { applyCoupon: async () => ({ valid: true, discountCents: 1000 }) }
		});
		const percent = await createCheckoutSession(withPercent, {
			items: [{ id: 'p1', quantity: 2 }],
			couponCode: 'TEN'
		});
		expect(percent.discountAmount).toBe(10);
		expect(percent.totalAmount).toBe(90);

		const withFixed = ports({
			discount: { applyCoupon: async () => ({ valid: true, discountCents: 999999 }) }
		});
		// Fixed discount larger than subtotal floors at MIN_CHARGE_CENTS ($0.50).
		const fixed = await createCheckoutSession(withFixed, {
			items: [{ id: 'p1', quantity: 1 }],
			couponCode: 'BIG'
		});
		expect(fixed.totalAmount).toBe(0.5);
	});

	it('ignores invalid coupons and enforces minimum order via ports', async () => {
		const p = ports({
			discount: { applyCoupon: async () => ({ valid: false, discountCents: 0 }) }
		});
		const result = await createCheckoutSession(p, {
			items: [{ id: 'p1', quantity: 1 }],
			couponCode: 'BOGUS'
		});
		expect(result.discountAmount).toBe(0);
		expect(result.totalAmount).toBe(50);
	});

	it('adds stripe tax calculation to the total', async () => {
		const p = ports({
			stripe: {
				getOrCreateCustomer: vi.fn().mockResolvedValue(null),
				calculateTax: vi.fn().mockResolvedValue({ taxAmountCents: 800, calculationId: 'tax_1' }),
				createPaymentIntent: vi.fn().mockResolvedValue({ clientSecret: 's' })
			}
		});
		const result = await createCheckoutSession(p, {
			items: [{ id: 'p1', quantity: 1 }],
			shippingAddress: {
				line1: '123 Market St',
				city: 'SF',
				postalCode: '94103',
				country: 'US'
			}
		});
		expect(result.taxAmount).toBe(8);
		expect(result.totalAmount).toBe(58);
	});

	it('enforces variant selection, ownership, and stock', async () => {
		const variantProduct = product({
			hasVariants: true,
			variants: [{ id: 'v1', stockQuantity: 5 }]
		});
		const p = ports({
			catalog: {
				resolveProduct: async () => ({ recordId: 'rec-p1', product: variantProduct })
			}
		});

		await expect(createCheckoutSession(p, { items: [{ id: 'p1', quantity: 1 }] })).rejects.toThrow(
			/Please select a variant/
		);
		await expect(
			createCheckoutSession(p, { items: [{ id: 'p1', variantId: 'nope', quantity: 1 }] })
		).rejects.toThrow(/Invalid variant/);
		await expect(
			createCheckoutSession(p, { items: [{ id: 'p1', variantId: 'v1', quantity: 99 }] })
		).rejects.toThrow(/out of stock/);

		const ok = await createCheckoutSession(p, {
			items: [{ id: 'p1', variantId: 'v1', quantity: 2 }]
		});
		expect(ok.subtotalAmount).toBe(100);
	});

	it('rejects unsupported currency and dust amounts', async () => {
		const p = ports();
		await expect(
			createCheckoutSession(p, {
				items: [{ id: 'p1', quantity: 1 }],
				customer: { currency: 'xxx' }
			})
		).rejects.toThrow(/Unsupported currency/);

		const cheap = ports({
			catalog: {
				resolveProduct: async () => ({
					recordId: 'r',
					product: product({ title: 'Sticker', priceValue: 0.1 })
				})
			}
		});
		await expect(
			createCheckoutSession(cheap, { items: [{ id: 's', quantity: 1 }] })
		).rejects.toThrow(/Amount too small/);
	});

	it('resolves stored customer id and persists stripe customer', async () => {
		const p = ports({
			customer: {
				findStoredCustomerId: vi.fn().mockResolvedValue('cus_stored'),
				persistCustomerId: vi.fn().mockResolvedValue(undefined),
				findCartRecordId: vi.fn().mockResolvedValue('cart_1')
			}
		});
		await createCheckoutSession(p, {
			items: [{ id: 'p1', quantity: 1 }],
			customer: { userId: 'u1', email: 'a@b.c', name: 'A' },
			shippingAddress: { line1: 'x', city: 'y', postalCode: 'z', country: 'US' }
		});
		expect(p.customer.persistCustomerId).toHaveBeenCalledWith('u1', 'cus_stored');
		expect(p.stripe.createPaymentIntent).toHaveBeenCalledWith(
			expect.objectContaining({
				customerId: 'cus_stored',
				metadata: expect.objectContaining({ cart_record_id: 'cart_1' })
			})
		);
	});

	it('checks out guests with email-only customer info (no userId)', async () => {
		const p = ports();
		const result = await createCheckoutSession(p, {
			items: [{ id: 'p1', quantity: 1 }],
			customer: { email: 'guest@example.com', name: 'Guest' },
			shippingAddress: { line1: 'x', city: 'y', postalCode: 'z', country: 'US' }
		});

		expect(result.totalAmount).toBe(50);
		// No account lookup or cart-record lookup for guests.
		expect(p.customer.findStoredCustomerId).not.toHaveBeenCalled();
		expect(p.customer.findCartRecordId).not.toHaveBeenCalled();
		// Guest email still drives Stripe customer resolution + order metadata.
		expect(p.stripe.getOrCreateCustomer).toHaveBeenCalledWith(
			'guest@example.com',
			'Guest',
			expect.anything()
		);
		expect(p.stripe.createPaymentIntent).toHaveBeenCalledWith(
			expect.objectContaining({
				customerId: 'cus_123',
				metadata: expect.objectContaining({ user_id: '' })
			})
		);
	});

	it('chunks large metadata and normalizes input strictly', () => {
		expect(resolveShippingCents('express')).toBe(2500);
		expect(resolveShippingCents('standard')).toBe(0);
		expect(chunkMetadata('a'.repeat(1200)).length).toBe(3);
		expect(() => normalizeIntakeRequest({ items: [] })).toThrow(IntakeError);
		expect(() => normalizeIntakeRequest({ items: [{ id: '', quantity: 1 }] })).toThrow(
			/Invalid item id/
		);
		const normalized = normalizeIntakeRequest({
			items: [{ id: ' p1 ', quantity: 2 }],
			couponCode: ' SAVE10 ',
			shippingOptionId: 'express',
			customerInfo: { email: 'a@b.c' }
		});
		expect(normalized.items[0].id).toBe('p1');
		expect(normalized.couponCode).toBe('SAVE10');
		expect(normalized.customer?.email).toBe('a@b.c');
	});
});
