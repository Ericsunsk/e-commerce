/**
 * Order visibility filters (pure domain).
 *
 * Account dashboards show account-linked orders plus historical guest orders
 * placed with the user's verified email. Orders under any other email stay
 * hidden by construction — the email predicate only ever matches the
 * caller's own address on rows with no linked user.
 */

export interface OrderFilterQuery {
	template: string;
	params: Record<string, unknown>;
}

/** List filter: own orders, plus unlinked rows carrying the verified email. */
export function buildUserOrdersFilter(userId: string, email?: string | null): OrderFilterQuery {
	const verifiedEmail = email?.trim();
	if (verifiedEmail) {
		return {
			template: 'user = {:userId} || (user = "" && customer_email = {:email})',
			params: { userId, email: verifiedEmail }
		};
	}
	return { template: 'user = {:userId}', params: { userId } };
}

/** Detail filter: same rule scoped to one order id (authorization boundary). */
export function buildOrderByIdFilter(
	orderId: string,
	userId: string,
	email?: string | null
): OrderFilterQuery {
	const verifiedEmail = email?.trim();
	if (verifiedEmail) {
		return {
			template:
				'(id = {:orderId} && user = {:userId}) || (id = {:orderId} && user = "" && customer_email = {:email})',
			params: { orderId, userId, email: verifiedEmail }
		};
	}
	return {
		template: 'id = {:orderId} && user = {:userId}',
		params: { orderId, userId }
	};
}

/** Fallback renderer for clients without `pb.filter()`: quote-escaped interpolation. */
export function renderFilter(query: OrderFilterQuery): string {
	let out = query.template;
	for (const [key, value] of Object.entries(query.params)) {
		const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		out = out.split(`{:${key}}`).join(`"${escaped}"`);
	}
	return out;
}
