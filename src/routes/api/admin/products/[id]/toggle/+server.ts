import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import {
	setProductActive,
	setProductFeatured,
	normalizeActiveToggle,
	normalizeFeaturedToggle
} from '$domains/catalog/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

/** Lightweight admin PATCH: flip `is_active` and/or `is_featured` without a full page reload. */
export const PATCH = apiHandler<RequestEvent>(
	async ({ params, request }) => {
		const body = await parseAndNormalizeJsonBody(
			request,
			(input) => input as Record<string, unknown>
		);

		const hasActive = 'is_active' in body;
		const hasFeatured = 'is_featured' in body;

		if (!hasActive && !hasFeatured) {
			throw error(400, '必须提供 is_active 或 is_featured');
		}

		let activeResult: { id: string; is_active: boolean } | undefined;
		let featuredResult: { id: string; is_featured: boolean } | undefined;

		if (hasActive) {
			activeResult = await setProductActive(params.id, normalizeActiveToggle(body));
		}
		if (hasFeatured) {
			featuredResult = await setProductFeatured(params.id, normalizeFeaturedToggle(body));
		}

		return {
			success: true,
			id: params.id,
			...(activeResult ? { is_active: activeResult.is_active } : {}),
			...(featuredResult ? { is_featured: featuredResult.is_featured } : {})
		};
	},
	{ admin: true }
);
