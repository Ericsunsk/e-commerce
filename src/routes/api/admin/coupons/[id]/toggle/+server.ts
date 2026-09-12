import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { setCouponActive } from '$domains/checkout/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const PATCH = apiHandler<RequestEvent>(
	async ({ params, request }) => {
		const body = await parseAndNormalizeJsonBody(
			request,
			(input) => input as Record<string, unknown>
		);

		const isActive = body.is_active;
		if (typeof isActive !== 'boolean') {
			throw error(400, 'is_active 必须是布尔值');
		}

		const result = await setCouponActive(params.id, isActive);
		return { success: true, ...result };
	},
	{ admin: true }
);
