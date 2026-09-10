/**
 * Order fulfillment rules (pure domain).
 *
 * Validates the "Mark as Shipped" payload, guards the paid/processing →
 * shipped transition, and fans out shipment notifications to subscribers
 * (email/SMS adapters register at the edge; the domain only emits).
 */
import type { OrderStatus } from './models';

export const FULFILLABLE_STATUSES: OrderStatus[] = ['paid', 'processing'];

export interface FulfillPayload {
	carrier: string;
	trackingNumber: string;
}

/** Parse the fulfill endpoint body; throws `{ status: 400 }` when invalid. */
export function normalizeFulfillBody(input: unknown): FulfillPayload {
	if (!input || typeof input !== 'object') {
		throw { status: 400, message: 'Invalid payload' };
	}
	const data = input as Record<string, unknown>;
	const carrier = typeof data.carrier === 'string' ? data.carrier.trim() : '';
	const trackingNumber =
		typeof data.trackingNumber === 'string'
			? data.trackingNumber.trim()
			: typeof data.tracking_number === 'string'
				? data.tracking_number.trim()
				: '';

	if (!carrier) throw { status: 400, message: 'Carrier is required' };
	if (!trackingNumber) throw { status: 400, message: 'Tracking number is required' };
	return { carrier, trackingNumber };
}

/** Only unfulfilled, paid work can transition to shipped. */
export function canMarkShipped(status: OrderStatus | string | undefined): boolean {
	return (FULFILLABLE_STATUSES as string[]).includes(status ?? '');
}

export interface ShippedNotification {
	orderId: string;
	carrier: string;
	trackingNumber: string;
	customerEmail: string;
	shippedAt: string;
}

export type ShippedListener = (event: ShippedNotification) => void | Promise<void>;

const listeners = new Set<ShippedListener>();

/** Register a shipment notification sink; returns an unsubscribe function. */
export function subscribeOrderShipped(listener: ShippedListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Emit a shipment event; one failing sink never blocks the rest. */
export async function emitOrderShipped(event: ShippedNotification): Promise<void> {
	for (const listener of [...listeners]) {
		try {
			await listener(event);
		} catch (err: unknown) {
			console.error(
				'[fulfillment] notification sink failed:',
				err instanceof Error ? err.message : String(err)
			);
		}
	}
}

/** Test-only: drop all subscribers to isolate test cases. */
export function clearShippedListeners(): void {
	listeners.clear();
}
