/**
 * Customer read-only view model (pure domain).
 *
 * Admin support views user accounts without any write path. List rows
 * carry masked emails; the detail view shows the full address.
 */

/** Mask an email for list display (`a•••@example.com`). */
export function maskEmail(email: string): string {
	if (!email || !email.includes('@')) return '—';
	const [local, domain] = email.split('@');
	if (!local || !domain) return '—';
	return `${local.slice(0, 1)}•••@${domain}`;
}

export interface CustomerRow {
	id: string;
	emailMasked: string;
	verified: boolean;
	orderCount: number;
}

export interface CustomerAddressView {
	id: string;
	recipientName: string;
	phone: string;
	address: string;
	isDefault: boolean;
}

export interface CustomerOrderView {
	id: string;
	date: string;
	status: string;
	total: number;
	currency: string;
}

/** Pure list-row projection. */
export function toCustomerRow(
	record: { id: string; email: string; verified?: boolean },
	orderCount: number
): CustomerRow {
	return {
		id: record.id,
		emailMasked: maskEmail(record.email),
		verified: record.verified === true,
		orderCount
	};
}
