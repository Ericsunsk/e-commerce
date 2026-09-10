/**
 * Stripe product/price provisioning (server-only).
 *
 * Provisions Stripe Product + Price objects for admin-created products and
 * executes Auto Price Roll on price edits (Stripe prices are immutable: a
 * new Price is created, the old one deactivated, PocketBase updated).
 * Past orders keep referencing their original price snapshots, so financial
 * history stays consistent.
 *
 * The Stripe client is an injected seam — unit tests pass a fake, production
 * passes the real SDK instance (see `liveProvisioningClient` in
 * `application/admin-products.server.ts`).
 */

export interface StripeProvisioningClient {
	products: {
		create(params: Record<string, unknown>): Promise<{ id: string }>;
		update(id: string, params: Record<string, unknown>): Promise<unknown>;
	};
	prices: {
		create(params: Record<string, unknown>): Promise<{ id: string }>;
		update(id: string, params: Record<string, unknown>): Promise<unknown>;
		retrieve(id: string): Promise<{ id: string; unit_amount: number | null; currency: string }>;
	};
}

export async function provisionStripeProduct(
	client: StripeProvisioningClient,
	input: { name: string; description?: string }
): Promise<{ productId: string }> {
	const product = await client.products.create({
		name: input.name,
		...(input.description ? { description: input.description } : {}),
		metadata: { provisioned_by: 'admin-portal' }
	});
	return { productId: product.id };
}

export async function provisionStripePrice(
	client: StripeProvisioningClient,
	input: { productId: string; unitAmountCents: number; currency: string }
): Promise<{ priceId: string }> {
	const price = await client.prices.create({
		product: input.productId,
		unit_amount: input.unitAmountCents,
		currency: input.currency.toLowerCase(),
		metadata: { provisioned_by: 'admin-portal' }
	});
	return { priceId: price.id };
}

/**
 * Provision Product + Price for a new catalog product. If price creation
 * fails, the orphan Stripe Product is deactivated (rollback) before rethrow.
 */
export async function createProductWithStripe(
	client: StripeProvisioningClient,
	input: { name: string; description?: string; unitAmountCents: number; currency: string }
): Promise<{ productId: string; priceId: string }> {
	const { productId } = await provisionStripeProduct(client, input);
	try {
		const { priceId } = await provisionStripePrice(client, {
			productId,
			unitAmountCents: input.unitAmountCents,
			currency: input.currency
		});
		return { productId, priceId };
	} catch (err: unknown) {
		try {
			await client.products.update(productId, { active: false });
		} catch {
			// Best-effort rollback; the original error carries the cause.
		}
		throw err;
	}
}

export interface PriceRollResult {
	priceId: string;
	/** True when a new Price was provisioned (false = money unchanged). */
	rolled: boolean;
}

/**
 * Auto Price Roll: provision a new Price and deactivate the old one.
 * Returns the existing price untouched when money is unchanged.
 */
export async function rollProductPrice(
	client: StripeProvisioningClient,
	input: {
		productId: string;
		oldPriceId?: string | null;
		unitAmountCents: number;
		currency: string;
	}
): Promise<PriceRollResult> {
	if (input.oldPriceId) {
		try {
			const current = await client.prices.retrieve(input.oldPriceId);
			const sameMoney =
				(current.unit_amount ?? 0) === input.unitAmountCents &&
				current.currency.toLowerCase() === input.currency.toLowerCase();
			if (sameMoney) {
				return { priceId: input.oldPriceId, rolled: false };
			}
		} catch {
			// Unresolvable old price: provision fresh below.
		}
	}

	const { priceId } = await provisionStripePrice(client, {
		productId: input.productId,
		unitAmountCents: input.unitAmountCents,
		currency: input.currency
	});

	if (input.oldPriceId) {
		try {
			await client.prices.update(input.oldPriceId, { active: false });
		} catch {
			// The new price is already live; a stale old price is reconciled by audit.
		}
	}
	return { priceId, rolled: true };
}
