import { json } from '@sveltejs/kit';
import { createCatalogProduct } from '$domains/catalog/server';
import { apiHandler } from '$shared/infrastructure/server';
import { parseProductRequest } from './_parse-product-body';

export const POST = apiHandler(
	async ({ request }) => {
		// Create ignores the CLEAR sentinel — there is no existing image to clear.
		const { body, mainImageFile, galleryUploads } = await parseProductRequest(request);
		const product = await createCatalogProduct(
			body,
			mainImageFile === 'CLEAR' ? null : mainImageFile,
			galleryUploads
		);
		return json({ success: true, product }, { status: 201 });
	},
	{ admin: true }
);
