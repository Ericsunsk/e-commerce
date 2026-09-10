import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fulfillAdminOrder } from '$domains/order/server';
import { normalizeFulfillBody } from '$domains/order/domain/order-fulfillment';
import { getErrorStatus } from '$shared/infrastructure/server';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.admin) {
		throw error(401, 'Admin authentication required');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	let payload;
	try {
		payload = normalizeFulfillBody(body);
	} catch (err: unknown) {
		throw error(getErrorStatus(err) ?? 400, 'Carrier and tracking number are required');
	}

	try {
		const order = await fulfillAdminOrder(params.id, payload);
		return json({
			success: true,
			order: {
				id: order.id,
				status: order.status,
				trackingNumber: order.trackingNumber,
				trackingCarrier: order.trackingCarrier
			}
		});
	} catch (err: unknown) {
		const status = getErrorStatus(err);
		if (status === 409) {
			throw error(409, err instanceof Error ? err.message : 'Order cannot be shipped');
		}
		if (status === 404) {
			throw error(404, 'Order not found');
		}
		throw error(500, 'Fulfillment failed');
	}
};
