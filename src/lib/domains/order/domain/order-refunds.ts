/**
 * Order refund rules (pure domain).
 *
 * Validates the "Issue Refund" payload and resolves the resulting order
 * status. Amounts are handled in integer cents; a null amount means a full
 * refund (Stripe refunds the entire PaymentIntent).
 */

export interface RefundRequest {
	/** Null = full refund of the payment intent. */
	amountCents: number | null;
	reason?: string;
}

/** Parse the refund endpoint body against the order total. Throws `{ status: 400 }`. */
export function normalizeRefundBody(input: unknown, orderTotalCents: number): RefundRequest {
	if (!input || typeof input !== 'object') {
		throw { status: 400, message: '请求数据格式错误' };
	}
	const data = input as Record<string, unknown>;
	const raw = data.amount;

	if (raw === undefined || raw === null || raw === '') {
		return { amountCents: null, reason: readReason(data.reason) };
	}

	const amount = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(amount) || amount <= 0) {
		throw { status: 400, message: '退款金额必须大于 0' };
	}
	const amountCents = Math.round(amount * 100);
	if (!Number.isFinite(orderTotalCents) || orderTotalCents <= 0) {
		throw { status: 400, message: '订单金额异常' };
	}
	if (amountCents > orderTotalCents) {
		throw { status: 400, message: '退款金额不能超过订单总额' };
	}
	return { amountCents, reason: readReason(data.reason) };
}

function readReason(raw: unknown): string | undefined {
	const reason = typeof raw === 'string' ? raw.trim() : '';
	return reason ? reason.slice(0, 500) : undefined;
}

/** Full refunds close the order; smaller amounts mark it partially refunded. */
export function resolveRefundStatus(
	request: RefundRequest,
	orderTotalCents: number
): 'refunded' | 'partially_refunded' {
	if (request.amountCents == null || request.amountCents >= orderTotalCents) return 'refunded';
	return 'partially_refunded';
}

/** Audit line appended to order notes (refund id + timestamp + reason). */
export function formatRefundNote(
	refundId: string,
	status: 'refunded' | 'partially_refunded',
	amountCents: number | null,
	reason: string | undefined,
	now: Date = new Date()
): string {
	const amount = amountCents == null ? 'full' : `${(amountCents / 100).toFixed(2)}`;
	const suffix = reason ? ` — ${reason}` : '';
	return `[refund ${refundId} ${now.toISOString()}] ${status} ${amount}${suffix}`;
}
