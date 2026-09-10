import { Collections, type TypedPocketBase } from '$shared/infrastructure';
import type { InventoryClient } from '../domain/inventory-allocation';

/** PocketBase-backed inventory client (shared by order reconciliation and webhooks). */
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
