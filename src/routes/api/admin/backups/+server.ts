import { createBackup, listBackupRows } from '$domains/platform/server';
import { apiHandler } from '$shared/infrastructure/server';

export const GET = apiHandler(
	async () => {
		return { success: true, backups: await listBackupRows() };
	},
	{ admin: true }
);

export const POST = apiHandler(
	async ({ request }) => {
		// Empty body is meaningful: it means "use the default basename".
		let basename = 'manual';
		try {
			const body = await request.json();
			if (typeof body?.basename === 'string' && body.basename.trim()) {
				basename = body.basename;
			}
		} catch {
			// Empty body → default basename.
		}

		await createBackup(basename);
		return { success: true };
	},
	{ admin: true }
);
