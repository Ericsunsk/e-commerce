import { pb } from './pocketbase';
import type { Order, OrderItem, ShippingAddress, OrderStatus } from '$lib/types';
import { Collections } from '$lib/pocketbase-types';
import { withAdmin } from '$lib/server/admin';

// =============================================================================
// Commerce Module - Orders
// =============================================================================

// DTO for creating an order (excludes system fields)
export interface CreateOrderDTO {
	userId?: string;
	stripeSessionId: string;
	stripePaymentIntent?: string;
	customerEmail: string;
	customerName?: string;
	items: any[]; // Input items (from cart/checkout)
	amountSubtotal: number;
	amountShipping: number;
	amountTax?: number;
	amountTotal: number;
	currency: string;
	status: OrderStatus;
	shippingAddress: ShippingAddress;
	trackingNumber?: string;
	trackingCarrier?: string;
	notes?: string;
}

export async function createOrder(orderData: CreateOrderDTO): Promise<Order | null> {
	return withAdmin(async (pb) => {
		// 1. Prepare Order record
		const orderPayload = {
			user: orderData.userId || null,
			stripe_session_id: orderData.stripeSessionId,
			stripe_payment_intent: orderData.stripePaymentIntent,
			customer_email: orderData.customerEmail,
			customer_name: orderData.customerName,
			items: orderData.items,
			amount_subtotal: orderData.amountSubtotal,
			amount_shipping: orderData.amountShipping,
			amount_tax: orderData.amountTax || 0,
			amount_total: orderData.amountTotal,
			currency: orderData.currency,
			status: orderData.status,
			shipping_address: orderData.shippingAddress,
			tracking_number: orderData.trackingNumber,
			tracking_carrier: orderData.trackingCarrier,
			notes: orderData.notes
		};

		const orderRecord = await pb.collection(Collections.Orders).create(orderPayload);

		if (orderRecord && orderData.items.length > 0) {
			const itemBatch = pb.createBatch();
			for (const item of orderData.items) {
				itemBatch.collection('order_items').create({
					order_id: orderRecord.id,
					product_id: item.productId,
					product_title_snap: item.title,
					price_snap: item.price,
					quantity: item.quantity,
					variant_id: item.variantId,
					sku_snap: item.skuSnap,
					variant_snap_json: {
						color: item.color,
						size: item.size
					}
				});
			}
			await itemBatch.send();
		}

		return mapRecordToOrder(orderRecord);
	}, null);
}

export async function getOrderBySessionId(sessionId: string): Promise<Order | null> {
	return withAdmin(async (pb) => {
		const record = await pb
			.collection(Collections.Orders)
			.getFirstListItem(pb.filter('stripe_session_id = {:sessionId}', { sessionId }));
		return mapRecordToOrder(record);
	}, null);
}

export async function getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | null> {
	return withAdmin(async (pb) => {
		const record = await pb
			.collection(Collections.Orders)
			.getFirstListItem(
				pb.filter('stripe_payment_intent = {:paymentIntentId}', { paymentIntentId })
			);
		return mapRecordToOrder(record);
	}, null);
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.Orders).getFullList({
			filter: pb.filter('user.id = {:userId}', { userId })
		});

		const sortedRecords = records.sort(
			(a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
		);

		return sortedRecords.map(mapRecordToOrder);
	}, []);
}

const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	pending: ['paid', 'cancelled'],
	paid: ['processing', 'cancelled', 'refunded'],
	processing: ['shipped', 'cancelled', 'refunded'],
	shipped: ['delivered', 'returned'],
	delivered: ['returned'],
	cancelled: [],
	refunded: [],
	returned: []
};

export async function updateOrderStatus(
	orderId: string,
	status: OrderStatus,
	trackingInfo?: { number: string; carrier: string }
): Promise<Order | null> {
	return withAdmin(async (pb) => {
		// 1. Fetch current order to validate transition
		const currentOrder = await pb.collection(Collections.Orders).getOne(orderId);
		const currentStatus = currentOrder.status as OrderStatus;

		// 2. Validate State Transition
		const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
		if (!allowedTransitions || !allowedTransitions.includes(status)) {
			console.warn(
				`⚠️ Invalid status transition from ${currentStatus} to ${status} for order ${orderId}`
			);
			throw new Error(`Invalid status transition: ${currentStatus} -> ${status}`);
		}

		const updateData: Record<string, any> = { status };
		if (trackingInfo) {
			updateData.tracking_number = trackingInfo.number;
			updateData.tracking_carrier = trackingInfo.carrier;
		}
		const record = await pb.collection(Collections.Orders).update(orderId, updateData);
		return mapRecordToOrder(record);
	}, null);
}

function mapRecordToOrder(record: any): Order {
	// Determine items: primary source is the JSON snapshot 'items'
	// Cast record to OrdersResponse to access typed fields, but record is 'any' here for flexibility with create/update returns
	const items: OrderItem[] = record.items || [];

	return {
		...record, // Spread DB fields (id, created, etc)
		userId: record.user,
		stripeSessionId: record.stripe_session_id,
		stripePaymentIntent: record.stripe_payment_intent,
		customerEmail: record.customer_email,
		customerName: record.customer_name,
		items,
		amountSubtotal: record.amount_subtotal,
		amountShipping: record.amount_shipping,
		amountTax: record.amount_tax || 0, // NEW: Map tax
		amountTotal: record.amount_total,
		currency: record.currency,
		status: record.status as OrderStatus,
		shippingAddress: record.shipping_address || {},
		trackingNumber: record.tracking_number,
		trackingCarrier: record.tracking_carrier,
		notes: record.notes
	};
}
