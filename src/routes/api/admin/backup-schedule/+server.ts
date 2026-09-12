import type { RequestHandler } from './$types';
import { getBackupSchedule, saveBackupSchedule } from '$domains/platform/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET: RequestHandler = apiHandler(
	async () => {
		return { success: true, settings: await getBackupSchedule() };
	},
	{ admin: true }
);

export const PUT: RequestHandler = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(request, (input) => input);
		return { success: true, settings: await saveBackupSchedule(body) };
	},
	{ admin: true }
);
