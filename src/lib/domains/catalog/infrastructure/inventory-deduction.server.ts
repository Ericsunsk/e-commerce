import { Collections, type TypedPocketBase } from '$shared/infrastructure';
import {
	createAdminClient,
	parseAndNormalizeJsonBody,
	readOptionalTrimmedString,
	readRequiredTrimmedString,
	requireObjectBody,
	throwBadRequest,
	withKeyedLock
} from '$shared/infrastructure/server';
import { assertN8nWebhookAuthorized } from '$domains/order/infrastructure/webhook-auth.server';
import {
	allocateInventory,
	type DeductRequest,
	type InventoryClient
} from '../domain/inventory-allocation';

export function normalizeDeductRequest(input: unknown): DeductRequest {
	const data = requireObjectBody(input) as Partial<DeductRequest>;
	const orderId = readRequiredTrimmedString(data.orderId, 'Missing orderId');

	if (!Array.isArray(data.items) || data.items.length === 0) {
		throwBadRequest('Missing items');
	}

	const items = data.items.map((item) => {
		const productId = readRequiredTrimmedString(item?.productId, 'Invalid item payload');
		const quantity = Number(item?.quantity);
		const variantIdRaw = readOptionalTrimmedString(item?.variantId) ?? '';

		if (!Number.isFinite(quantity) || quantity <= 0) {
			throwBadRequest('Invalid item payload');
		}

		return { productId, quantity, variantId: variantIdRaw || null };
	});

	return { orderId, items };
}

/** PocketBase-backed inventory client (shared by the deduct route and order reconciliation). */
export function buildPocketBaseInventoryClient(pb: TypedPocketBase): InventoryClient {
	return {
		async getVariant(variantId: string) {
			const v = await pb.collection(Collections.ProductVariants).getOne(variantId);
			return { id: v.id, product: v.product, stock_quantity: Number(v.stock_quantity) || 0 };
		},
		async getVariantsForProduct(productId: string) {
			const variants = await pb.collection(Collections.ProductVariants).getFullList({
				filter: `product="${productId}"`
			});
			return variants.map((v) => ({
				id: v.id,
				product: v.product,
				stock_quantity: Number(v.stock_quantity) || 0
			}));
		},
		async updateStock(variantId: string, stockQuantity: number) {
			await pb.collection(Collections.ProductVariants).update(variantId, {
				stock_quantity: stockQuantity
			});
		}
	};
}

/** Thin-adapter seam: parse, authorize, then delegate to the deep domain module. */
export async function deductInventory(request: Request) {
	assertN8nWebhookAuthorized(request);
	const payload = await parseAndNormalizeJsonBody(request, normalizeDeductRequest);

	const pb = await createAdminClient();
	return allocateInventory(buildPocketBaseInventoryClient(pb), withKeyedLock, payload);
}
