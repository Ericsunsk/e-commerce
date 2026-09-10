/**
 * Order Reconciliation — self-healing checkout success (pure domain).
 *
 * If the external webhook/automation has not created the order by the time
 * the buyer lands on `/checkout/success`, verify the Stripe PaymentIntent
 * directly and idempotently record the order plus inventory deduction.
 *
 * Pure: all I/O crosses explicit seams so tests run fully in-memory.
 * Concurrency safety comes from running the whole check-then-create flow
 * under a per-payment-intent lock (`order:<paymentIntentId>`).
 */

export interface ReconciledOrderItem {
	id: string;
	productId: string;
	variantId: string | null;
	title: string;
	price: number; // cents
	quantity: number;
	skuSnap?: string;
	color: string;
	size: string;
	image: string;
}

export interface ReconciledOrderData {
	placed_at_override: string;
	cart_record_id: string;
	user_id: string;
	customer_email: string;
	customer_name: string;
	items: ReconciledOrderItem[];
	amount_subtotal: number;
	amount_shipping: number;
	amount_tax: number;
	amount_total: number;
	currency: string;
	shipping_address: Record<string, unknown>;
	coupon_code: string;
}

/**
 * Reassemble the chunked `order_data_part_N` Stripe metadata entries back
 * into structured order data (inverse of the intake-side chunking).
 * Returns null when metadata is absent or malformed.
 */
export function reassembleOrderData(metadata: Record<string, string>): ReconciledOrderData | null {
	try {
		const partCount = Number(metadata.order_data_parts ?? 0);
		if (!Number.isFinite(partCount) || partCount <= 0) return null;
		let raw = '';
		for (let i = 1; i <= partCount; i++) {
			const part = metadata[`order_data_part_${i}`];
			if (typeof part !== 'string') return null;
			raw += part;
		}
		const data = JSON.parse(raw) as ReconciledOrderData;
		if (!data || !Array.isArray(data.items)) return null;
		return data;
	} catch {
		return null;
	}
}

/** Split order JSON into Stripe-metadata-sized parts (shared with intake). */
export function splitOrderData(value: string, maxLen = 500): string[] {
	const parts: string[] = [];
	for (let i = 0; i < value.length; i += maxLen) parts.push(value.slice(i, i + maxLen));
	return parts;
}

export interface VerifiedPaymentIntent {
	id: string;
	status: string;
	metadata: Record<string, string>;
}

export interface ReconciliationPorts {
	payments: {
		retrievePaymentIntent(paymentIntentId: string): Promise<VerifiedPaymentIntent>;
	};
	orders: {
		findByPaymentIntentId(paymentIntentId: string): Promise<string | null>;
		createOrder(data: ReconciledOrderData, paymentIntentId: string): Promise<string>;
	};
	inventory: {
		deduct(orderId: string, items: ReconciledOrderItem[]): Promise<{ success: boolean }>;
	};
	lock: <T>(key: string, task: () => Promise<T>) => Promise<T>;
}

export type ReconciliationOutcome =
	| { outcome: 'already-exists'; orderId: string }
	| { outcome: 'not-ready'; orderId: null }
	| { outcome: 'missing-order-data'; orderId: null }
	| { outcome: 'created'; orderId: string; inventoryDeducted: boolean };

/**
 * Idempotently reconcile one payment intent into an order record.
 * Safe under concurrent arrivals and webhook races: the second check inside
 * the lock observes orders created between the fast-path check and lock
 * acquisition, so `createOrder` runs at most once per payment intent.
 */
export async function reconcileOrder(
	ports: ReconciliationPorts,
	paymentIntentId: string
): Promise<ReconciliationOutcome> {
	const fastPath = await ports.orders.findByPaymentIntentId(paymentIntentId);
	if (fastPath) return { outcome: 'already-exists', orderId: fastPath };

	return ports.lock(`order:${paymentIntentId}`, async () => {
		const existing = await ports.orders.findByPaymentIntentId(paymentIntentId);
		if (existing) return { outcome: 'already-exists', orderId: existing };

		const intent = await ports.payments.retrievePaymentIntent(paymentIntentId);
		if (intent.status !== 'succeeded') return { outcome: 'not-ready', orderId: null };

		// Webhook may have won the race while we awaited Stripe.
		const raced = await ports.orders.findByPaymentIntentId(paymentIntentId);
		if (raced) return { outcome: 'already-exists', orderId: raced };

		const orderData = reassembleOrderData(intent.metadata);
		if (!orderData) return { outcome: 'missing-order-data', orderId: null };

		const orderId = await ports.orders.createOrder(orderData, paymentIntentId);
		const deduction = await ports.inventory.deduct(orderId, orderData.items);
		return { outcome: 'created', orderId, inventoryDeducted: deduction.success };
	});
}
