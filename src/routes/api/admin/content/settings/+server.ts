import { getAdminSiteSettings, saveAdminSiteSettings } from '$domains/content/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET = apiHandler(
	async () => {
		return { success: true, settings: await getAdminSiteSettings() };
	},
	{ admin: true }
);

export const PUT = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		return { success: true, settings: await saveAdminSiteSettings(body) };
	},
	{ admin: true }
);
