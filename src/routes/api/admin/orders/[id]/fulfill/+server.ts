import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { fulfillAdminOrder, normalizeFulfillBody } from '$domains/order/server';
import {
	apiHandler,
	getErrorStatus,
	parseAndNormalizeJsonBody
} from '$shared/infrastructure/server';

export const POST = apiHandler<RequestEvent>(
	async ({ params, request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);

		let payload;
		try {
			payload = normalizeFulfillBody(body);
		} catch (err: unknown) {
			throw error(getErrorStatus(err) ?? 400, '请填写承运商和运单号');
		}

		let order;
		try {
			order = await fulfillAdminOrder(params.id, payload);
		} catch (err: unknown) {
			// Preserve the domain's intended status: the admin UI distinguishes
			// "already shipped" (409) from "no such order" (404).
			const status = getErrorStatus(err);
			if (status === 409) {
				throw error(409, err instanceof Error ? err.message : '该订单无法发货');
			}
			if (status === 404) {
				throw error(404, '订单不存在');
			}
			throw err;
		}

		return {
			success: true,
			order: {
				id: order.id,
				status: order.status,
				trackingNumber: order.trackingNumber,
				trackingCarrier: order.trackingCarrier
			}
		};
	},
	{ admin: true }
);
