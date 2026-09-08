/**
 * InventoryAllocation — deep transactional module.
 *
 * Encapsulates variant resolution, ownership validation, stock sufficiency
 * checks, and distributed lock orchestration behind a single atomic
 * deduction interface. The HTTP endpoint becomes a thin adapter that
 * constructs an injectable client and delegates across the seam.
 *
 * Pure domain module: no server-only imports so Vitest can load it
 * without pulling PocketBase / rate-limiter side effects.
 */

export interface VariantRecord {
	id: string;
	product: string;
	stock_quantity: number;
}

/**
 * Injectables that let the allocation algorithm run against any backend —
 * PocketBase in production, an in-memory store in tests. No HTTP, no lock
 * implementation detail leaks into the domain logic.
 */
export interface InventoryClient {
	getVariant(variantId: string): Promise<VariantRecord | null>;
	getVariantsForProduct(productId: string): Promise<VariantRecord[]>;
	updateStock(variantId: string, stockQuantity: number): Promise<void>;
}

export type LockFn = <T>(key: string, task: () => Promise<T>) => Promise<T>;

export interface DeductItem {
	productId: string;
	variantId?: string | null;
	quantity: number;
}

export interface DeductRequest {
	orderId: string;
	items: DeductItem[];
}

export interface DeductResult {
	productId: string;
	variantId: string | null;
	success: boolean;
	previousStock: number;
	newStock: number;
	error?: string;
}

export interface DeductResponse {
	success: boolean;
	orderId: string;
	results: DeductResult[];
	processedAt: string;
}

/**
 * Atomically allocate (deduct) inventory for a batch of order items.
 *
 * Each item runs under a per-variant/per-product distributed lock so that
 * concurrent orders cannot oversell. Variant lookup, ownership validation,
 * and stock sufficiency are resolved inside the critical section.
 */
export async function allocateInventory(
	client: InventoryClient,
	lock: LockFn,
	request: DeductRequest
): Promise<DeductResponse> {
	const results: DeductResult[] = [];
	let allSuccess = true;

	for (const item of request.items) {
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
			await lock(lockKey, async () => {
				let targetVariantId = item.variantId;

				if (!targetVariantId) {
					const variants = await client.getVariantsForProduct(item.productId);
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

				const variant = await client.getVariant(targetVariantId);
				if (!variant) {
					result.error = `Variant ${targetVariantId} not found`;
					return;
				}
				if (variant.product !== item.productId) {
					result.error = 'variantId does not belong to productId';
					return;
				}

				const currentStock = Number(variant.stock_quantity) || 0;
				result.variantId = variant.id;
				result.previousStock = currentStock;

				if (currentStock < item.quantity) {
					result.newStock = currentStock;
					result.error = `Insufficient stock: have ${currentStock}, need ${item.quantity}`;
					return;
				}

				const newStock = currentStock - item.quantity;
				await client.updateStock(variant.id, newStock);
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
		orderId: request.orderId,
		results,
		processedAt: new Date().toISOString()
	};
}
