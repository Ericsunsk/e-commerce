import type { Order, OrderItem, ShippingAddress, OrderStatus } from '../domain/models';
import { canMarkShipped, type FulfillPayload } from '../domain/order-fulfillment';
import { formatRefundNote } from '../domain/order-refunds';
import {
	buildOrderByIdFilter,
	buildUserOrdersFilter,
	type OrderFilterQuery
} from '../domain/order-filters';
import {
	Collections,
	type OrdersResponse,
	type OrderItemsResponse,
	type TypedPocketBase
} from '$shared/infrastructure';
import { withAdmin, buildPocketBaseFilter } from '$shared/infrastructure/server';

export async function getOrdersByUserWithClient(
	pb: TypedPocketBase,
	userId: string,
	email?: string | null
): Promise<Order[]> {
	const filter = resolveOrderFilter(pb, buildUserOrdersFilter(userId, email));

	let orders: OrdersResponse[];
	try {
		orders = (await pb.collection(Collections.Orders).getFullList({
			filter,
			sort: '-placed_at_override,-placed_at'
		})) as OrdersResponse[];
	} catch {
		orders = (await pb.collection(Collections.Orders).getFullList({ filter })) as OrdersResponse[];
	}

	if (orders.length === 0) return [];

	const orderIds = orders.map((o) => o.id);
	const filterExpr = orderIds.map((id: string) => `order_id="${id}"`).join('||');

	const allItems = (await pb.collection(Collections.OrderItems).getFullList({
		filter: filterExpr
	})) as OrderItemsResponse[];

	return orders.map((orderRecord) => {
		const relatedItems = allItems.filter(
			(item: OrderItemsResponse) => item.order_id === orderRecord.id
		);
		return mapOrderRecordWithResolvedItems(orderRecord, relatedItems);
	});
}

export async function getOrderById(
	orderId: string,
	userId: string,
	email?: string | null
): Promise<Order | null> {
	return withAdmin(async (pb) => {
		try {
			const orderRecord = await pb
				.collection(Collections.Orders)
				.getFirstListItem(resolveOrderFilter(pb, buildOrderByIdFilter(orderId, userId, email)));

			const items = await pb.collection(Collections.OrderItems).getFullList({
				filter: pb.filter('order_id = {:orderId}', { orderId })
			});
			return mapOrderRecordWithResolvedItems(orderRecord, items);
		} catch {
			return null;
		}
	}, null);
}

type OrderRecordWithItems = OrdersResponse & { items?: unknown };

export type AdminOrderStatusFilter = 'all' | 'unfulfilled' | OrderStatus;

function adminStatusFilter(status: AdminOrderStatusFilter): string | undefined {
	if (status === 'all') return undefined;
	if (status === 'unfulfilled') return 'status = "paid" || status = "processing"';
	return `status = "${status}"`;
}

/** Admin: list store orders (optionally by status tab) with items batched in one query. */
export async function listAllOrdersWithClient(
	pb: TypedPocketBase,
	status: AdminOrderStatusFilter = 'all'
): Promise<Order[]> {
	const filter = adminStatusFilter(status);
	const orders = (await pb.collection(Collections.Orders).getFullList({
		...(filter ? { filter } : {}),
		sort: '-placed_at_override,-placed_at'
	})) as OrdersResponse[];

	if (orders.length === 0) return [];

	const orderIds = orders.map((o) => o.id);
	const filterExpr = orderIds.map((id: string) => `order_id="${id}"`).join('||');

	const allItems = (await pb.collection(Collections.OrderItems).getFullList({
		filter: filterExpr
	})) as OrderItemsResponse[];

	return orders.map((orderRecord) => {
		const relatedItems = allItems.filter(
			(item: OrderItemsResponse) => item.order_id === orderRecord.id
		);
		return mapOrderRecordWithResolvedItems(orderRecord, relatedItems);
	});
}

/** Admin: fetch one order by id (no customer scoping). */
export async function getAdminOrderByIdWithClient(
	pb: TypedPocketBase,
	orderId: string
): Promise<Order | null> {
	try {
		const orderRecord = await pb.collection(Collections.Orders).getOne(orderId);
		const items = await pb.collection(Collections.OrderItems).getFullList({
			filter: `order_id="${orderId}"`
		});
		return mapOrderRecordWithResolvedItems(orderRecord, items as OrderItemsResponse[]);
	} catch {
		return null;
	}
}

/**
 * Admin: mark an order shipped with carrier + tracking. Rejects orders
 * outside the paid/processing window with `{ status: 409 }`.
 */
export async function fulfillOrderWithClient(
	pb: TypedPocketBase,
	orderId: string,
	payload: FulfillPayload
): Promise<Order> {
	const current = await pb.collection(Collections.Orders).getOne(orderId);
	if (!canMarkShipped((current as OrdersResponse).status as OrderStatus)) {
		throw {
			status: 409,
			message: `订单当前状态为 "${(current as OrdersResponse).status}"，无法标记发货`
		};
	}

	const updated = await pb.collection(Collections.Orders).update(orderId, {
		tracking_carrier: payload.carrier,
		tracking_number: payload.trackingNumber,
		status: 'shipped'
	});
	const items = await pb.collection(Collections.OrderItems).getFullList({
		filter: `order_id="${orderId}"`
	});
	return mapOrderRecordWithResolvedItems(updated as OrdersResponse, items as OrderItemsResponse[]);
}

export interface RefundRecord {
	refundId: string;
	status: 'refunded' | 'partially_refunded';
	amountCents: number | null;
	reason?: string;
}

/** Admin: persist a Stripe refund outcome (status + audit note). */
export async function recordRefundWithClient(
	pb: TypedPocketBase,
	orderId: string,
	refund: RefundRecord
): Promise<Order> {
	const current = (await pb.collection(Collections.Orders).getOne(orderId)) as OrdersResponse;
	const existingNotes = typeof current.notes === 'string' ? current.notes : '';
	const note = formatRefundNote(refund.refundId, refund.status, refund.amountCents, refund.reason);
	const updated = await pb.collection(Collections.Orders).update(orderId, {
		status: refund.status,
		notes: existingNotes ? `${existingNotes}\n${note}` : note
	});
	const items = await pb.collection(Collections.OrderItems).getFullList({
		filter: `order_id="${orderId}"`
	});
	return mapOrderRecordWithResolvedItems(updated as OrdersResponse, items as OrderItemsResponse[]);
}

/** Update an order's status (used by reconciliation/webhook flows). */
export async function updateOrderStatusWithClient(
	pb: TypedPocketBase,
	orderId: string,
	status: OrderStatus
): Promise<void> {
	await pb.collection(Collections.Orders).update(orderId, { status });
}

/** Render a pure filter query via `pb.filter()` when available, else escaped fallback. */
function resolveOrderFilter(pb: TypedPocketBase, query: OrderFilterQuery): string {
	return buildPocketBaseFilter(pb, query.template, query.params);
}

function mapOrderRecordWithResolvedItems(
	orderRecord: OrdersResponse,
	resolvedItems: OrderItemsResponse[]
): Order {
	const snapshotItems = (orderRecord as OrderRecordWithItems).items;
	const items = resolvedItems.length > 0 ? resolvedItems : snapshotItems;

	const recordWithItems = Object.assign(orderRecord as unknown as OrderRecordWithItems, {
		items
	});

	return mapRecordToOrder(recordWithItems);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function mapRecordToOrder(record: OrderRecordWithItems): Order {
	const rawItems = Array.isArray(record.items) ? record.items : [];
	const items = rawItems.reduce<OrderItem[]>((acc, item: unknown, index: number) => {
		if (isRecord(item)) {
			const productId = typeof item.productId === 'string' ? item.productId : undefined;
			const title = typeof item.title === 'string' ? item.title : undefined;
			const price = typeof item.price === 'number' ? item.price : undefined;
			const quantity = typeof item.quantity === 'number' ? item.quantity : undefined;

			if (productId && title && typeof price === 'number' && typeof quantity === 'number') {
				acc.push({
					id: typeof item.id === 'string' && item.id ? item.id : `${record.id}_${index}`,
					productId,
					variantId: typeof item.variantId === 'string' ? item.variantId : undefined,
					title,
					price,
					quantity,
					image: typeof item.image === 'string' ? item.image : undefined,
					skuSnap: typeof item.skuSnap === 'string' ? item.skuSnap : undefined,
					color: typeof item.color === 'string' ? item.color : undefined,
					size: typeof item.size === 'string' ? item.size : undefined
				});
				return acc;
			}
		}

		const dbItem = item as OrderItemsResponse;
		const productId = typeof dbItem.product_id === 'string' ? dbItem.product_id : '';
		if (!productId) return acc;

		const variantSnap = isRecord(dbItem.variant_snap_json) ? dbItem.variant_snap_json : null;
		const color =
			variantSnap && typeof variantSnap.color === 'string' ? variantSnap.color : undefined;
		const size = variantSnap && typeof variantSnap.size === 'string' ? variantSnap.size : undefined;

		acc.push({
			id: dbItem.id,
			productId,
			variantId: dbItem.variant_id,
			title: dbItem.product_title_snap,
			price: dbItem.price_snap,
			quantity: dbItem.quantity,
			image: dbItem.image_snap,
			skuSnap: dbItem.sku_snap,
			color,
			size
		});

		return acc;
	}, []);

	const shippingAddress =
		record.shipping_address && typeof record.shipping_address === 'object'
			? (record.shipping_address as ShippingAddress)
			: {
					name: '',
					line1: '',
					city: '',
					postalCode: '',
					country: ''
				};

	return {
		id: record.id,
		placed_at:
			typeof record.placed_at === 'string' ? record.placed_at : String(record.placed_at || ''),
		placed_at_override: record.placed_at_override,
		userId: record.user,
		stripeSessionId: record.stripe_session_id,
		stripePaymentIntent: record.stripe_payment_intent,
		customerEmail: record.customer_email || '',
		customerName: record.customer_name || undefined,
		items,
		amountSubtotal: record.amount_subtotal || 0,
		amountShipping: record.amount_shipping || 0,
		amountTax: record.amount_tax || 0,
		amountTotal: record.amount_total || 0,
		currency: record.currency || 'usd',
		status: (record.status as unknown as OrderStatus) || 'pending',
		shippingAddress,
		trackingNumber: record.tracking_number,
		trackingCarrier: record.tracking_carrier,
		notes: record.notes
	};
}
