import { testS3Connection } from '$domains/platform/server';
import { apiHandler } from '$shared/infrastructure/server';

/** Test S3 connectivity for `?filesystem=storage|backups` (default storage). */
export const POST = apiHandler(
	async ({ url }) => {
		const result = await testS3Connection(url.searchParams.get('filesystem') || 'storage');
		return { success: true, ...result };
	},
	{ admin: true }
);
