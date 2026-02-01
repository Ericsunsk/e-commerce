// pb import removed as it is shadowed by withAdmin argument
import type { Order, OrderItem, ShippingAddress, OrderStatus } from '$lib/types';
import { Collections } from '$lib/pocketbase-types';
import type { OrdersResponse, OrderItemsResponse } from '$lib/pocketbase-types';
import { withAdmin } from '$lib/server/admin';

// =============================================================================
// Commerce Module - Orders
// =============================================================================

// DTO for creating an order item
export interface CreateOrderItemDTO {
	productId: string;
	title: string;
	price: number;
	quantity: number;
	variantId?: string;
	skuSnap?: string;
	color?: string;
	size?: string;
	image?: string;
}

// DTO for creating an order (excludes system fields)
export interface CreateOrderDTO {
	userId?: string;
	stripeSessionId: string;
	stripePaymentIntent?: string;
	customerEmail: string;
	customerName?: string;
	items: CreateOrderItemDTO[]; // Input items (from cart/checkout or stripe)
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
		console.log('[createOrder] Preparing payload for user:', orderData.userId);

		// Sanitize user ID - ensure empty string becomes null
		const userId = orderData.userId && orderData.userId.trim().length > 0 ? orderData.userId : null;
		// Sanitize Stripe IDs - empty strings should not be sent at all to avoid unique constraint violations
		const stripeSessionId =
			orderData.stripeSessionId && orderData.stripeSessionId.trim().length > 0
				? orderData.stripeSessionId
				: undefined;
		const stripePaymentIntent =
			orderData.stripePaymentIntent && orderData.stripePaymentIntent.trim().length > 0
				? orderData.stripePaymentIntent
				: undefined;

		const orderPayload = {
			user: userId,
			// Only include stripe IDs if they have actual values (avoid unique constraint on null/empty)
			...(stripeSessionId && { stripe_session_id: stripeSessionId }),
			...(stripePaymentIntent && { stripe_payment_intent: stripePaymentIntent }),
			customer_email: orderData.customerEmail,
			customer_name: orderData.customerName,
			items: orderData.items,
			amount_subtotal: orderData.amountSubtotal,
			amount_shipping: orderData.amountShipping,
			amount_tax: orderData.amountTax || 0,
			amount_total: orderData.amountTotal,
			currency: orderData.currency,
			status: orderData.status as unknown as import('$lib/pocketbase-types').OrdersStatusOptions,
			shipping_address: orderData.shippingAddress,
			tracking_number: orderData.trackingNumber,
			tracking_carrier: orderData.trackingCarrier,
			notes: orderData.notes
		};

		console.log('[createOrder] Payload:', JSON.stringify(orderPayload, null, 2));

		const orderRecord = await pb.collection(Collections.Orders).create(orderPayload);

		if (orderRecord && orderData.items.length > 0) {
			console.log(
				`[createOrder] Creating ${orderData.items.length} items for order ${orderRecord.id}`
			);

			// Create items one by one (batch API is disabled on remote PocketBase)
			for (const item of orderData.items) {
				// Sanitize variant_id: ensure empty string becomes null
				const variantId =
					item.variantId && item.variantId.trim().length > 0 ? item.variantId : null;

				const itemPayload = {
					order_id: orderRecord.id,
					product_id: item.productId,
					product_title_snap: item.title,
					price_snap: item.price,
					image_snap: item.image, // Save image snapshot
					quantity: item.quantity,
					variant_id: variantId,
					sku_snap: item.skuSnap,
					variant_snap_json: {
						color: item.color,
						size: item.size
					}
				};

				try {
					console.log('[createOrder] Creating order item:', JSON.stringify(itemPayload));
					await pb.collection(Collections.OrderItems).create(itemPayload);
				} catch (itemError) {
					console.error('[createOrder] FAILED to create order item:', itemError);
					// Continue with other items even if one fails
				}
			}
			console.log('[createOrder] Order items created successfully');
		}

		// Manually attach items to the record for mapping, as they are not returned by create
		const recordWithItems = {
			...orderRecord,
			items: orderData.items
		} as unknown as OrderRecordWithItems;
		return mapRecordToOrder(recordWithItems);
	}, null);
}

// Optimized fetching for Order History List View
export async function getOrdersByUser(userId: string): Promise<Order[]> {
	return withAdmin(async (pb) => {
		// 1. Fetch Orders
		const orders = await pb.collection(Collections.Orders).getFullList({
			filter: pb.filter('user = {:userId}', { userId }),
			sort: '-created'
		});

		if (orders.length === 0) return [];

		// 2. Fetch ALL related items for these orders in one query
		// This avoids N+1 problem.
		// Note: Filter string length limit might be an issue for huge lists, but 50-100 orders is fine.
		const orderIds = orders.map((o) => o.id);
		// Construct filter: order_id = 'id1' || order_id = 'id2' ...
		const filterExpr = orderIds.map((id) => `order_id="${id}"`).join('||');

		const allItems = await pb.collection(Collections.OrderItems).getFullList({
			filter: filterExpr
		});

		// 3. Map items to orders
		return orders.map((orderRecord) => {
			const relatedItems = allItems.filter((item) => item.order_id === orderRecord.id);

			// We construct a record-like object that mapRecordToOrder expects
			const recordWithItems = {
				...orderRecord,
				items: relatedItems
			} as unknown as OrderRecordWithItems;

			return mapRecordToOrder(recordWithItems);
		});
	}, []);
}

export async function getOrderById(orderId: string, userId: string): Promise<Order | null> {
	return withAdmin(async (pb) => {
		try {
			// 1. Fetch Order with strict user ownership check
			const orderRecord = await pb
				.collection(Collections.Orders)
				.getFirstListItem(pb.filter('id = {:orderId} && user = {:userId}', { orderId, userId }));

			// 2. Fetch Items
			const items = await pb.collection(Collections.OrderItems).getFullList({
				filter: pb.filter('order_id = {:orderId}', { orderId })
			});

			// 3. Merge and Map
			const recordWithItems = {
				...orderRecord,
				items: items
			} as unknown as OrderRecordWithItems;

			return mapRecordToOrder(recordWithItems);
		} catch (e) {
			// 404 if not found or not owned by user
			return null;
		}
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

// Original getOrdersByUser removed in favor of optimized version above
// export async function getOrdersByUser(userId: string): Promise<Order[]> { ... }

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

		const updateData: Record<string, unknown> = { status };
		if (trackingInfo) {
			updateData.tracking_number = trackingInfo.number;
			updateData.tracking_carrier = trackingInfo.carrier;
		}
		const record = await pb.collection(Collections.Orders).update(orderId, updateData);
		return mapRecordToOrder(record);
	}, null);
}

// Helper type for mapping
type OrderRecordWithItems = OrdersResponse<any> & {
	items?: (OrderItemsResponse | OrderItem)[]; // Can be DB responses or our DTOs
	amount_tax?: number; // Missing from generated types
};

function mapRecordToOrder(record: OrderRecordWithItems): Order {
	// Determine items: primary source is the JSON snapshot 'items'
	// Determine items: primary source is the JSON snapshot 'items'
	// Cast record to OrdersResponse to access typed fields, but record is 'any' here for flexibility with create/update returns
	const items: OrderItem[] = (record.items || []).map((item: any) => {
		// If it's already an OrderItem (from CreateOrderDTO), return it
		if (item.productId && item.price !== undefined) return item as OrderItem;

		// If it's a DB record (OrderItemsResponse), map it
		return {
			...item,
			productId: item.product_id,
			variantId: item.variant_id,
			title: item.product_title_snap,
			price: item.price_snap,
			image: item.image_snap, // Map snapshot to internal model
			skuSnap: item.sku_snap,
			variantSnap: item.variant_snap_json
		} as unknown as OrderItem;
	});

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
		status: record.status as unknown as OrderStatus,
		shippingAddress: record.shipping_address || {},
		trackingNumber: record.tracking_number,
		trackingCarrier: record.tracking_carrier,
		notes: record.notes
	};
}
