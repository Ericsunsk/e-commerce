/**
 * Inventory capability (Catalog's published interface to other contexts).
 *
 * Order fulfillment and Stripe webhooks need to deduct stock. They do not need
 * to know how allocation works, that it is keyed-locked, or that stock lives in
 * PocketBase. This module is the seam: it wires the pure `allocateInventory`
 * domain module to the PocketBase adapter and exposes one call.
 *
 * Before this existed, `order/` reached past Catalog's barrel into
 * `domain/inventory-allocation` AND `infrastructure/inventory-deduction.server`
 * — five separate violations of Principle IX. A barrel that callers bypass is
 * not an interface, so the fix is to publish the capability, not to widen the
 * barrel and let callers keep assembling the pieces themselves.
 */

import type { TypedPocketBase } from '$shared/infrastructure';
import { withKeyedLock } from '$shared/infrastructure/server';
import {
	allocateInventory,
	type DeductRequest,
	type DeductResponse
} from '../domain/inventory-allocation';
import { buildPocketBaseInventoryClient } from '../infrastructure/inventory-deduction.server';

/** Build the allocator bound to a PocketBase client. */
export function createInventoryAllocator(pb: TypedPocketBase) {
	const client = buildPocketBaseInventoryClient(pb);
	return {
		/** Allocate (deduct) stock for every item, atomically per variant. */
		allocate: (request: DeductRequest): Promise<DeductResponse> =>
			allocateInventory(client, withKeyedLock, request)
	};
}

export type InventoryAllocator = ReturnType<typeof createInventoryAllocator>;
export type { DeductRequest, DeductResponse };
