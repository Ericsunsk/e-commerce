import { Collections } from '$lib/pocketbase-types';
import { apiHandler } from '$lib/server/api-handler';
import { withKeyedLock } from '$lib/server/locks';
import { assertN8nWebhookAuthorized } from '$lib/server/n8n-webhook';
import { createAdminClient } from '$lib/server/pocketbase';
import {
	readOptionalTrimmedString,
	readRequiredTrimmedString,
	parseAndNormalizeJsonBody,
	requireObjectBody,
	throwBadRequest
} from '$lib/server/request-body';
import { computeStockStatus } from '$lib/server/stock-status';
import type { RequestHandler } from './$types';

interface DeductItem {
	productId: string;
	variantId?: string | null;
	quantity: number;
}

interface DeductRequest {
	orderId: string;
	items: DeductItem[];
}

interface DeductResult {
	productId: string;
	variantId: string | null;
	success: boolean;
	previousStock: number;
	newStock: number;
	error?: string;
}

function normalizeRequestBody(input: unknown): DeductRequest {
	const data = requireObjectBody(input) as Partial<DeductRequest>;
	const orderId = readRequiredTrimmedString(data.orderId, 'Missing orderId');

	if (!Array.isArray(data.items) || data.items.length === 0) {
		throwBadRequest('Missing items');
	}

	const items: DeductItem[] = data.items.map((item) => {
		const productId = readRequiredTrimmedString(item?.productId, 'Invalid item payload');
		const quantity = Number(item?.quantity);
		const variantIdRaw = readOptionalTrimmedString(item?.variantId) ?? '';

		if (!Number.isFinite(quantity) || quantity <= 0) {
			throwBadRequest('Invalid item payload');
		}

		return {
			productId,
			quantity,
			variantId: variantIdRaw || null
		};
	});

	return { orderId, items };
}

export const POST: RequestHandler = apiHandler(async ({ request }) => {
	assertN8nWebhookAuthorized(request);
	const payload = await parseAndNormalizeJsonBody(request, normalizeRequestBody);

	const pb = await createAdminClient();
	const results: DeductResult[] = [];
	let allSuccess = true;

	for (const item of payload.items) {
		const lockKey = item.variantId
			? `inventory:variant:${item.variantId}`
			: `inventory:product:${item.productId}`;
		const result: DeductResult = {
			productId: item.productId,
			variantId: item.variantId || null,
			success: false,
			previousStock: 0,
			newStock: 0
		};

		try {
			await withKeyedLock(lockKey, async () => {
				let targetVariantId = item.variantId;

				if (!targetVariantId) {
					const variants = await pb.collection(Collections.ProductVariants).getFullList({
						filter: `product="${item.productId}"`
					});

					if (variants.length === 0) {
						result.error = 'No variants found for product; variantId is required';
						return;
					}

					if (variants.length > 1) {
						result.error = 'Multiple variants found; variantId is required';
						return;
					}

					targetVariantId = variants[0].id;
				}

				const variant = await pb.collection(Collections.ProductVariants).getOne(targetVariantId);
				if (variant.product !== item.productId) {
					result.error = 'variantId does not belong to productId';
					return;
				}

				const currentStock = Number(variant.stock_quantity) || 0;
				result.variantId = variant.id;
				result.previousStock = currentStock;

				if (currentStock < item.quantity) {
					result.error = `Insufficient stock: have ${currentStock}, need ${item.quantity}`;
					return;
				}

				const newStock = currentStock - item.quantity;
				await pb.collection(Collections.ProductVariants).update(variant.id, {
					stock_quantity: newStock,
					stock_status: computeStockStatus(newStock)
				});

				result.newStock = newStock;
				result.success = true;
			});
		} catch (err) {
			result.error = err instanceof Error ? err.message : String(err);
		}

		if (!result.success) {
			allSuccess = false;
		}
		results.push(result);
	}

	return {
		success: allSuccess,
		orderId: payload.orderId,
		results,
		processedAt: new Date().toISOString()
	};
});
