import type { RequestEvent } from './$types';
import { saveAdminCategory, deleteAdminCategory } from '$domains/catalog/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const PATCH = apiHandler<RequestEvent>(
	async ({ params, request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		return { success: true, category: await saveAdminCategory(params.id, body) };
	},
	{ admin: true }
);

export const DELETE = apiHandler<RequestEvent>(
	async ({ params }) => {
		await deleteAdminCategory(params.id);
		return { success: true };
	},
	{ admin: true }
);
