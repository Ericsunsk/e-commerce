import type { RequestEvent } from './$types';
import { updateCatalogProduct, deleteCatalogProduct } from '$domains/catalog/server';
import { apiHandler } from '$shared/infrastructure/server';
import { parseProductRequest } from '../_parse-product-body';

export const PATCH = apiHandler<RequestEvent>(
	async ({ params, request }) => {
		const { body, mainImageFile, galleryUploads } = await parseProductRequest(request);
		const product = await updateCatalogProduct(params.id, body, mainImageFile, galleryUploads);
		return { success: true, product };
	},
	{ admin: true }
);

export const DELETE = apiHandler<RequestEvent>(
	async ({ params }) => {
		await deleteCatalogProduct(params.id);
		return { success: true };
	},
	{ admin: true }
);
