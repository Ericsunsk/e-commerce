import type { PageServerLoad } from './$types';
import { listBackupRows } from '$domains/platform/server';

export const load: PageServerLoad = async () => {
	return { backups: await listBackupRows() };
};
