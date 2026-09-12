import { json } from '@sveltejs/kit';
import { listAdminNav, saveAdminNavItem } from '$domains/content/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET = apiHandler(
	async ({ url }) => {
		const location = url.searchParams.get('location') || undefined;
		return { success: true, items: await listAdminNav(location ?? undefined) };
	},
	{ admin: true }
);

export const POST = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		const item = await saveAdminNavItem(null, body);
		return json({ success: true, item }, { status: 201 });
	},
	{ admin: true }
);
