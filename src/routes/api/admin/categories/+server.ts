import { json } from '@sveltejs/kit';
import { listAdminCategories, saveAdminCategory } from '$domains/catalog/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET = apiHandler(
	async () => {
		return { success: true, categories: await listAdminCategories() };
	},
	{ admin: true }
);

export const POST = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		const category = await saveAdminCategory(null, body);
		return json({ success: true, category }, { status: 201 });
	},
	{ admin: true }
);
