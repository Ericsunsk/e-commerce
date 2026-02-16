// pb import removed as it is shadowed by withAdmin argument
import type { Order, OrderItem, ShippingAddress, OrderStatus } from '$lib/types';
import { Collections } from '$lib/pocketbase-types';
import type { OrdersResponse, OrderItemsResponse, TypedPocketBase } from '$lib/pocketbase-types';
import { withAdmin } from '$lib/server/admin';

// =============================================================================
// Commerce Module - Orders (Read Model)
// =============================================================================

// Optimized fetching for Order History List View
export async function getOrdersByUserWithClient(
	pb: TypedPocketBase,
	userId: string
): Promise<Order[]> {
	// 1. Fetch Orders
	const pbAny = pb as unknown as {
		filter?: (query: string, params: Record<string, unknown>) => string;
	};
	const filter = pbAny.filter ? pbAny.filter('user = {:userId}', { userId }) : `user = "${userId}"`;

	let orders: OrdersResponse[];
	try {
		orders = (await pb.collection(Collections.Orders).getFullList({
			filter,
			sort: '-placed_at_override,-placed_at'
		})) as OrdersResponse[];
	} catch {
		// Some PocketBase instances don't expose/sort by base system fields.
		// Fall back to default ordering if placed_at is missing.
		orders = (await pb.collection(Collections.Orders).getFullList({ filter })) as OrdersResponse[];
	}

	if (orders.length === 0) return [];

	// 2. Fetch ALL related items for these orders in one query
	// This avoids N+1 problem.
	// Note: Filter string length limit might be an issue for huge lists, but 50-100 orders is fine.
	const orderIds = orders.map((o) => o.id);
	// Construct filter: order_id = 'id1' || order_id = 'id2' ...
	const filterExpr = orderIds.map((id: string) => `order_id="${id}"`).join('||');

	const allItems = (await pb.collection(Collections.OrderItems).getFullList({
		filter: filterExpr
	})) as OrderItemsResponse[];

	// 3. Map items to orders (fallback to order snapshot if order_items missing)
	return orders.map((orderRecord) => {
		const relatedItems = allItems.filter(
			(item: OrderItemsResponse) => item.order_id === orderRecord.id
		);
		return mapOrderRecordWithResolvedItems(orderRecord, relatedItems);
	});
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
			return mapOrderRecordWithResolvedItems(orderRecord, items);
		} catch {
			// 404 if not found or not owned by user
			return null;
		}
	}, null);
}

// Helper type for mapping.
// Note: this PocketBase instance treats JSON fields as unknown in generated types.
type OrderRecordWithItems = OrdersResponse & { items?: unknown };

function mapOrderRecordWithResolvedItems(
	orderRecord: OrdersResponse,
	resolvedItems: OrderItemsResponse[]
): Order {
	const snapshotItems = (orderRecord as OrderRecordWithItems).items;
	const items = resolvedItems.length > 0 ? resolvedItems : snapshotItems;

	// IMPORTANT: Avoid spreading PocketBase records here. Some system fields (e.g. created)
	// can be non-enumerable in certain runtimes and would be dropped.
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
		// Snapshot/DTO shape
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

		// DB record shape (order_items)
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
