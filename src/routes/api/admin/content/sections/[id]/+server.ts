import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import {
	getAdminSectionById,
	saveAdminSection,
	patchAdminSection,
	deleteAdminSection
} from '$domains/content/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

export const GET = apiHandler<RequestEvent>(
	async ({ params }) => {
		const section = await getAdminSectionById(params.id);
		if (!section) {
			throw error(404, '区块不存在');
		}
		return { success: true, section };
	},
	{ admin: true }
);

export const PATCH = apiHandler<RequestEvent>(
	async ({ params, request }) => {
		const body = await parseAndNormalizeJsonBody(
			request,
			(input) => input as Record<string, unknown>
		);

		// If only partial fields like is_active or sort_order are sent
		if (
			!('type' in body) &&
			!('heading' in body) &&
			('is_active' in body || 'sort_order' in body)
		) {
			const section = await patchAdminSection(params.id, {
				is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
				sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined
			});
			return { success: true, section };
		}

		return { success: true, section: await saveAdminSection(params.id, body) };
	},
	{ admin: true }
);

export const DELETE = apiHandler<RequestEvent>(
	async ({ params }) => {
		await deleteAdminSection(params.id);
		return { success: true };
	},
	{ admin: true }
);
