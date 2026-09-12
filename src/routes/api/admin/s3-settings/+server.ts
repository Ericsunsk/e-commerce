import type { RequestHandler } from './$types';
import { getMaskedS3, saveS3Settings } from '$domains/platform/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET: RequestHandler = apiHandler(
	async () => {
		return { success: true, settings: await getMaskedS3() };
	},
	{ admin: true }
);

export const PUT: RequestHandler = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		return { success: true, settings: await saveS3Settings(body) };
	},
	{ admin: true }
);
