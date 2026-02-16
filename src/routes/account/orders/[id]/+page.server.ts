import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrderById } from '$lib/server/orders';
import type { OrderDetail } from '$lib/types';
import { Collections, type ProductsResponse, type TypedPocketBase } from '$lib/pocketbase-types';
import { getFileUrl } from '$lib/utils/image';
import { getErrorStatus } from '$lib/server/pocketbase-json';
import { createAdminClient } from '$lib/server/pocketbase';

async function resolveProductMainImage(pb: TypedPocketBase, idOrSlug: string): Promise<string> {
	if (!idOrSlug) return '';

	try {
		const record = await pb
			.collection(Collections.Products)
			.getOne<ProductsResponse>(idOrSlug, { fields: 'id,collectionId,main_image,slug' });
		return record.main_image
			? getFileUrl(record.collectionId || 'products', record.id, record.main_image)
			: '';
	} catch (err: unknown) {
		if (getErrorStatus(err) !== 404) throw err;
	}

	try {
		const record = await pb
			.collection(Collections.Products)
			.getFirstListItem<ProductsResponse>(`slug="${idOrSlug}"`, {
				fields: 'id,collectionId,main_image,slug'
			});
		return record.main_image
			? getFileUrl(record.collectionId || 'products', record.id, record.main_image)
			: '';
	} catch {
		return '';
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	// 1. Auth Check
	if (!locals.user) {
		throw redirect(303, `/auth/login?redirectTo=/account/orders/${params.id}`);
	}

	// 2. Fetch Order
	const order = await getOrderById(params.id, locals.user.id);

	if (!order) {
		throw error(404, 'Order not found');
	}

	// 3. Map to View Model (OrderDetail)
	const date = order.placed_at_override || order.placed_at || '';

	let adminPb: TypedPocketBase | null = null;
	const resolveFallbackImage = async (
		productId: string | undefined
	): Promise<string | undefined> => {
		if (!productId) return undefined;

		try {
			const url = await resolveProductMainImage(locals.pb, productId);
			return url || undefined;
		} catch (err: unknown) {
			const status = getErrorStatus(err);
			// If read rules block product access for auth users, fall back to admin client.
			if (status !== 401 && status !== 403) return undefined;
		}

		try {
			adminPb ||= await createAdminClient();
			const url = await resolveProductMainImage(adminPb, productId);
			return url || undefined;
		} catch {
			return undefined;
		}
	};

	const orderDetail: OrderDetail = {
		id: order.id,
		date,
		status: order.status,
		total: order.amountTotal,
		currency: order.currency,
		itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
		firstItemTitle: order.items[0]?.title,

		// Detail specific fields
		items: await Promise.all(
			order.items.map(async (item) => {
				const image = item.image || (await resolveFallbackImage(item.productId));
				return {
					id: item.id,
					title: item.title,
					price: item.price,
					quantity: item.quantity,
					image,
					variant: [item.color, item.size].filter(Boolean).join(' / ') || undefined
				};
			})
		),
		shippingAddress: order.shippingAddress,
		tracking: order.trackingNumber
			? {
					number: order.trackingNumber,
					carrier: order.trackingCarrier || 'Unknown'
				}
			: undefined
	};

	return {
		order: orderDetail
	};
};
