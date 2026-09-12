import type { RequestEvent } from './$types';
import { saveAdminNavItem, deleteAdminNavItem } from '$domains/content/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const PATCH = apiHandler<RequestEvent>(
	async ({ params, request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		return { success: true, item: await saveAdminNavItem(params.id, body) };
	},
	{ admin: true }
);

export const DELETE = apiHandler<RequestEvent>(
	async ({ params }) => {
		await deleteAdminNavItem(params.id);
		return { success: true };
	},
	{ admin: true }
);
