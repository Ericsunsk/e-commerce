import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAdminPages, saveAdminPage } from '$domains/content/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET: RequestHandler = apiHandler(
	async () => {
		return { success: true, pages: await listAdminPages() };
	},
	{ admin: true }
);

export const POST: RequestHandler = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		const page = await saveAdminPage(null, body);
		return json({ success: true, page }, { status: 201 });
	},
	{ admin: true }
);
