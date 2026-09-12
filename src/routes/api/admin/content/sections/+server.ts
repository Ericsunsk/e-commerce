import { json } from '@sveltejs/kit';
import { listAdminSections, saveAdminSection } from '$domains/content/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET = apiHandler(
	async ({ url }) => {
		const pageId = url.searchParams.get('pageId') || undefined;
		return { success: true, sections: await listAdminSections(pageId) };
	},
	{ admin: true }
);

export const POST = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		const section = await saveAdminSection(null, body);
		return json({ success: true, section }, { status: 201 });
	},
	{ admin: true }
);
