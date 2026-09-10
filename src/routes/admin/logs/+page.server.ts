import type { PageServerLoad } from './$types';
import { listServerLogs } from '$domains/platform/server';

export const load: PageServerLoad = async ({ url }) => {
	const result = await listServerLogs({
		level: url.searchParams.get('level') ?? undefined,
		query: url.searchParams.get('q') ?? undefined,
		page: url.searchParams.get('page') ?? undefined
	});
	return result;
};
