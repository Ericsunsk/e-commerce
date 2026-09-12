/**
 * Checkout Intake — deep session module (pure domain).
 *
 * Encapsulates catalog price verification, variant selection enforcement,
 * coupon validation, customer resolution, Stripe Tax calculation, and
 * metadata chunking behind a single session-creation interface.
 *
 * Pure: no server-only imports (no Stripe SDK, no PocketBase). All I/O
 * crosses explicit seams so unit tests run fully in-memory.
 */

import { STRIPE } from './models';

export class IntakeError extends Error {
	status = 400;
	constructor(message: string) {
		super(message);
		this.name = 'IntakeError';
	}
}

// ---------------------------------------------------------------------------
// Request shape
// ---------------------------------------------------------------------------

export interface IntakeLineInput {
	id: string;
	variantId?: string | null;
	quantity: number;
	color?: string;
	size?: string;
	image?: string;
}

export interface IntakeCustomerInput {
	userId?: string;
	email?: string;
	name?: string;
	currency?: string;
}

export interface IntakeAddressInput {
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postalCode: string;
	country: string;
}

export interface IntakeRequest {
	items: IntakeLineInput[];
	couponCode?: string;
	shippingOptionId?: string;
	shippingAddress?: IntakeAddressInput;
	customer?: IntakeCustomerInput;
}

/** Parse/validate untrusted JSON into an IntakeRequest. Throws IntakeError (400). */
export function normalizeIntakeRequest(input: unknown): IntakeRequest {
	if (!input || typeof input !== 'object') throw new IntakeError('Invalid items');
	const data = input as Record<string, unknown>;
	const rawItems = data.items;
	if (!Array.isArray(rawItems) || rawItems.length === 0) throw new IntakeError('Invalid items');

	const items: IntakeLineInput[] = rawItems.map((raw) => {
		const item = (raw ?? {}) as Record<string, unknown>;
		const id = typeof item.id === 'string' ? item.id.trim() : '';
		const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity);
		if (!id) throw new IntakeError('Invalid item id');
		if (!Number.isFinite(quantity) || quantity <= 0)
			throw new IntakeError(`Invalid quantity for item: ${id}`);
		const variantRaw = typeof item.variantId === 'string' ? item.variantId.trim() : '';
		return {
			id,
			variantId: variantRaw.length > 0 ? variantRaw : null,
			quantity,
			color: typeof item.color === 'string' ? item.color : undefined,
			size: typeof item.size === 'string' ? item.size : undefined,
			image: typeof item.image === 'string' ? item.image : undefined
		};
	});

	const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
	const customerRaw = (data.customer ?? data.customerInfo ?? {}) as Record<string, unknown>;
	const shippingRaw = (data.shippingAddress ?? data.shippingInfo ?? undefined) as
		| Record<string, unknown>
		| undefined;

	return {
		items,
		couponCode: str(data.couponCode),
		shippingOptionId: str(data.shippingOptionId),
		shippingAddress: shippingRaw
			? {
					line1: String(shippingRaw.line1 ?? ''),
					line2: str(shippingRaw.line2),
					city: String(shippingRaw.city ?? ''),
					state: str(shippingRaw.state),
					postalCode: String(shippingRaw.postalCode ?? ''),
					country: String(shippingRaw.country ?? '')
				}
			: undefined,
		customer: {
			userId: str(customerRaw.userId),
			email: str(customerRaw.email),
			name: str(customerRaw.name),
			currency: str(customerRaw.currency)
		}
	};
}

// ---------------------------------------------------------------------------
// Seams (ports)
// ---------------------------------------------------------------------------

export interface IntakeVariant {
	id: string;
	sku?: string;
	color?: string;
	size?: string;
	image?: string;
	stockQuantity?: number;
	/** Variant-level price in dollars; undefined inherits `IntakeProduct.priceValue`. */
	price?: number;
}

export interface IntakeProduct {
	title: string;
	priceValue: number;
	image?: string;
	hasVariants: boolean;
	stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
	variants?: IntakeVariant[];
}

export interface CatalogPort {
	resolveProduct(itemId: string): Promise<{ recordId: string; product: IntakeProduct } | null>;
	/** DEV-only fallback unit price (dollars) when catalog price is missing. */
	devFallbackUnitPrice?: number;
	isDev?: boolean;
}

export interface DiscountPort {
	applyCoupon(
		code: string,
		amountCents: number
	): Promise<{ valid: boolean; discountCents: number }>;
}

export interface TaxLine {
	id: string;
	title: string;
	quantity: number;
	priceCents: number;
}

export interface StripePort {
	getOrCreateCustomer(
		email: string,
		name: string,
		address: IntakeAddressInput
	): Promise<string | null>;
	calculateTax(
		lines: TaxLine[],
		address: IntakeAddressInput,
		currency: string
	): Promise<{ taxAmountCents: number; calculationId: string | null }>;
	createPaymentIntent(params: {
		amount: number;
		currency: string;
		customerId: string | null;
		metadata: Record<string, string>;
	}): Promise<{ clientSecret: string | null }>;
}

export interface CustomerPort {
	findStoredCustomerId(userId: string): Promise<string | null>;
	persistCustomerId(userId: string, customerId: string): Promise<void>;
	findCartRecordId(userId: string): Promise<string>;
}

export interface IntakePorts {
	catalog: CatalogPort;
	discount: DiscountPort;
	stripe: StripePort;
	customer: CustomerPort;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function resolveShippingCents(optionId?: string): number {
	return optionId === 'express' ? 2500 : 0;
}

export function assertSupportedCurrency(currency: string): void {
	if (!(STRIPE.SUPPORTED_CURRENCIES as readonly string[]).includes(currency.toUpperCase())) {
		throw new IntakeError('Unsupported currency');
	}
}

/** Split a JSON string into Stripe-metadata-sized parts (default 500 chars). */
export function chunkMetadata(value: string, maxLen = 500): string[] {
	const parts: string[] = [];
	for (let i = 0; i < value.length; i += maxLen) parts.push(value.slice(i, i + maxLen));
	return parts;
}

export interface PricedLine {
	id: string;
	productId: string;
	variantId: string | null;
	title: string;
	priceCents: number;
	quantity: number;
	skuSnap?: string;
	color: string;
	size: string;
	image: string;
}

export interface IntakeResult {
	clientSecret: string | null;
	subtotalAmount: number;
	discountAmount: number;
	shippingAmount: number;
	taxAmount: number;
	totalAmount: number;
}

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
	ports: IntakePorts,
	request: IntakeRequest
): Promise<IntakeResult> {
	const priced: PricedLine[] = [];
	const taxLines: TaxLine[] = [];
	let amount = 0;

	for (const rawItem of request.items) {
		const resolved = await ports.catalog.resolveProduct(rawItem.id);
		if (!resolved)
			throw new IntakeError(`Item not available: ${rawItem.id}. Please remove it from your cart.`);
		const { product, recordId } = resolved;
		const variantId = rawItem.variantId ?? null;
		const variant = variantId ? product.variants?.find((v) => v.id === variantId) : undefined;

		if (product.hasVariants && !variantId)
			throw new IntakeError(`Please select a variant for ${product.title}.`);
		if (variantId && !variant)
			throw new IntakeError(
				`Invalid variant selected for ${product.title}. Please remove it from your cart.`
			);

		// Best-effort stock pre-check (final deduction is idempotent on webhook).
		if (variant) {
			if (Number(variant.stockQuantity || 0) < rawItem.quantity)
				throw new IntakeError(
					`Item out of stock: ${product.title}. Please remove it from your cart.`
				);
		} else if (product.stockStatus === 'out_of_stock') {
			throw new IntakeError(
				`Item out of stock: ${product.title}. Please remove it from your cart.`
			);
		}

		// A variant may carry its own price (colour/size pricing). When it does,
		// that is the price charged; otherwise the variant inherits the
		// product-level price.
		const variantPrice = variant?.price;
		let unitPrice =
			typeof variantPrice === 'number' && Number.isFinite(variantPrice) && variantPrice > 0
				? variantPrice
				: product.priceValue;
		if ((!Number.isFinite(unitPrice) || unitPrice <= 0) && ports.catalog.isDev) {
			unitPrice = ports.catalog.devFallbackUnitPrice ?? 0;
		}
		const priceCents = Math.round(unitPrice * 100);
		if (!Number.isFinite(priceCents) || priceCents <= 0)
			throw new IntakeError(
				`Invalid price for item: ${product.title}. Please remove it from your cart.`
			);

		amount += priceCents * rawItem.quantity;
		priced.push({
			id: rawItem.id,
			productId: recordId,
			variantId,
			title: product.title,
			priceCents,
			quantity: rawItem.quantity,
			skuSnap: variant?.sku,
			color: variant?.color || rawItem.color || 'Standard',
			size: variant?.size || rawItem.size || 'Generic',
			image: variant?.image || product.image || rawItem.image || ''
		});
		taxLines.push({
			id: rawItem.id,
			title: product.title,
			quantity: rawItem.quantity,
			priceCents
		});
	}

	const subtotal = amount;
	const shippingAmountCents = resolveShippingCents(request.shippingOptionId);

	if (request.couponCode) {
		const coupon = await ports.discount.applyCoupon(request.couponCode, amount);
		if (coupon.valid && coupon.discountCents > 0) {
			amount = Math.max(STRIPE.MIN_CHARGE_CENTS, amount - coupon.discountCents);
		}
	}
	const discountAppliedCents = Math.max(0, subtotal - amount);
	if (amount < STRIPE.MIN_CHARGE_CENTS) throw new IntakeError('Amount too small');

	const currency = request.customer?.currency || 'usd';
	assertSupportedCurrency(currency);

	// Customer resolution: stored id first, else Stripe lookup/creation.
	let customerId: string | null = null;
	const userId = request.customer?.userId;
	if (userId) customerId = await ports.customer.findStoredCustomerId(userId);
	if (!customerId && request.customer?.email && request.shippingAddress) {
		customerId = await ports.stripe.getOrCreateCustomer(
			request.customer.email,
			request.customer.name || 'Guest',
			request.shippingAddress
		);
	}
	if (userId && customerId) {
		await ports.customer.persistCustomerId(userId, customerId);
	}

	let taxAmountCents = 0;
	let taxCalculationId: string | null = null;
	if (request.shippingAddress) {
		const tax = await ports.stripe.calculateTax(taxLines, request.shippingAddress, currency);
		taxAmountCents = tax.taxAmountCents;
		taxCalculationId = tax.calculationId;
	}

	const totalAmount = amount + taxAmountCents + shippingAmountCents;
	const cartRecordId = userId ? await ports.customer.findCartRecordId(userId) : '';

	const orderData = {
		placed_at_override: new Date().toISOString(),
		cart_record_id: cartRecordId,
		user_id: userId || '',
		customer_email: request.customer?.email || '',
		customer_name: request.customer?.name || 'Guest',
		items: priced.map((p) => ({
			id: p.id,
			productId: p.productId,
			variantId: p.variantId,
			title: p.title,
			price: p.priceCents,
			quantity: p.quantity,
			skuSnap: p.skuSnap,
			color: p.color,
			size: p.size,
			image: p.image
		})),
		amount_subtotal: subtotal,
		amount_shipping: shippingAmountCents,
		amount_tax: taxAmountCents,
		amount_total: totalAmount,
		currency: currency.toLowerCase(),
		shipping_address: request.shippingAddress || {},
		coupon_code: request.couponCode || ''
	};

	const orderDataString = JSON.stringify(orderData);
	const orderDataParts = chunkMetadata(orderDataString);
	const metadata: Record<string, string> = {
		items_summary: priced
			.map((i) => `${i.quantity}x ${i.title}`)
			.join(', ')
			.substring(0, 500),
		order_data_parts: String(orderDataParts.length),
		...Object.fromEntries(orderDataParts.map((part, i) => [`order_data_part_${i + 1}`, part])),
		user_id: userId || '',
		cart_record_id: cartRecordId,
		placed_at_override: orderData.placed_at_override,
		coupon_code: request.couponCode || '',
		tax_calculation_id: taxCalculationId || ''
	};

	const intent = await ports.stripe.createPaymentIntent({
		amount: totalAmount,
		currency: currency.toLowerCase(),
		customerId,
		metadata
	});

	return {
		clientSecret: intent.clientSecret,
		subtotalAmount: subtotal / 100,
		discountAmount: discountAppliedCents / 100,
		shippingAmount: shippingAmountCents / 100,
		taxAmount: taxAmountCents / 100,
		totalAmount: totalAmount / 100
	};
}
