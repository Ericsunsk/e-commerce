import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { getAdminPageById, saveAdminPage, deleteAdminPage } from '$domains/content/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET = apiHandler<RequestEvent>(
	async ({ params }) => {
		const page = await getAdminPageById(params.id);
		if (!page) {
			throw error(404, '页面不存在');
		}
		return { success: true, page };
	},
	{ admin: true }
);

export const PATCH = apiHandler<RequestEvent>(
	async ({ params, request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		return { success: true, page: await saveAdminPage(params.id, body) };
	},
	{ admin: true }
);

export const DELETE = apiHandler<RequestEvent>(
	async ({ params }) => {
		await deleteAdminPage(params.id);
		return { success: true };
	},
	{ admin: true }
);
