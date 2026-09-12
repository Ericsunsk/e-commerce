/**
 * Customer read-only admin (server-only, zero write path).
 */
import { withAdmin, buildPocketBaseFilter } from '$shared/infrastructure/server';
import {
	Collections,
	type TypedPocketBase,
	type UsersResponse,
	type UserAddressesResponse,
	type OrdersResponse
} from '$shared/infrastructure';
import {
	toCustomerRow,
	type CustomerRow,
	type CustomerAddressView,
	type CustomerOrderView
} from '../domain/customer-admin';

export interface CustomerListPage {
	rows: CustomerRow[];
	page: number;
	perPage: number;
	totalPages: number;
	totalItems: number;
}

async function countOrdersWithClient(pb: TypedPocketBase, userId: string): Promise<number> {
	try {
		const result = await pb.collection(Collections.Orders).getList(1, 1, {
			filter: buildPocketBaseFilter(pb, 'user = {:userId}', { userId }),
			fields: 'id'
		});
		return result.totalItems;
	} catch {
		return 0;
	}
}

/** Paginated customer list with per-user order counts. */
export async function listAdminCustomers(query: string, page: number): Promise<CustomerListPage> {
	const perPage = 20;
	const safePage = Math.min(Math.max(page || 1, 1), 1000);
	return withAdmin(
		async (pb) => {
			const filter = query ? buildPocketBaseFilter(pb, 'email ~ {:query}', { query }) : undefined;
			const result = await pb.collection(Collections.Users).getList(safePage, perPage, {
				sort: '-id',
				...(filter ? { filter } : {})
			});
			const rows: CustomerRow[] = [];
			for (const record of result.items as UsersResponse[]) {
				rows.push(
					toCustomerRow(
						{ id: record.id, email: record.email, verified: record.verified },
						await countOrdersWithClient(pb, record.id)
					)
				);
			}
			return {
				rows,
				page: result.page,
				perPage: result.perPage,
				totalPages: result.totalPages,
				totalItems: result.totalItems
			};
		},
		{
			rows: [],
			page: safePage,
			perPage,
			totalPages: 1,
			totalItems: 0
		}
	);
}

export interface CustomerDetail {
	id: string;
	email: string;
	verified: boolean;
	addresses: CustomerAddressView[];
	orders: CustomerOrderView[];
}

/** Full customer detail (profile + addresses + recent orders, read-only). */
export async function getAdminCustomerById(userId: string): Promise<CustomerDetail | null> {
	return withAdmin(async (pb) => {
		let user: UsersResponse;
		try {
			user = await pb.collection(Collections.Users).getOne(userId);
		} catch {
			return null;
		}

		let addresses: UserAddressesResponse[] = [];
		try {
			addresses = (await pb.collection(Collections.UserAddresses).getFullList({
				filter: buildPocketBaseFilter(pb, 'user = {:userId}', { userId })
			})) as UserAddressesResponse[];
		} catch {
			// Address read failure must not block the detail view.
		}

		let orders: OrdersResponse[] = [];
		try {
			orders = (await pb.collection(Collections.Orders).getFullList({
				filter: buildPocketBaseFilter(pb, 'user = {:userId}', { userId }),
				sort: '-placed_at_override,-placed_at'
			})) as OrdersResponse[];
		} catch {
			// Same tolerance as addresses.
		}

		return {
			id: user.id,
			email: user.email,
			verified: user.verified === true,
			addresses: addresses.map((address) => ({
				id: address.id,
				recipientName: address.recipient_name || '',
				phone: address.phone || '',
				address: [address.line1, address.city, address.postal_code, address.country]
					.filter(Boolean)
					.join(', '),
				isDefault: user.default_shipping_address === address.id
			})),
			orders: orders.slice(0, 10).map((order) => ({
				id: order.id,
				date: order.placed_at_override || String(order.placed_at || ''),
				status: String(order.status || ''),
				total: Number(order.amount_total) || 0,
				currency: order.currency || 'usd'
			}))
		};
	}, null);
}
