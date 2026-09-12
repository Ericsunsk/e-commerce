import { error } from '@sveltejs/kit';
import { extractGalleryUploads } from '$domains/catalog/server';

/**
 * Parse a product create/update request into its three parts.
 *
 * Product writes accept two shapes: a JSON body, or `multipart/form-data` with
 * the product as a JSON string in `data` plus file parts. Both POST (create)
 * and PATCH (update) handled this identically, so it lives here once.
 *
 * `mainImageFile` is tri-state on update and must stay that way:
 *   - `null`  — no change to the current image
 *   - `File`  — replace it
 *   - `'CLEAR'` — remove it
 * Collapsing `null` and `'CLEAR'` would make "leave the image alone" and
 * "delete the image" indistinguishable.
 */
export interface ParsedProductBody {
	body: unknown;
	mainImageFile: File | null | 'CLEAR';
	galleryUploads: Map<string, File[]>;
}

export async function parseProductRequest(request: Request): Promise<ParsedProductBody> {
	const contentType = request.headers.get('content-type') || '';
	let body: unknown;
	let mainImageFile: File | null | 'CLEAR' = null;
	let galleryUploads = new Map<string, File[]>();

	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();
		const rawData = formData.get('data');
		if (typeof rawData !== 'string') {
			throw error(400, '缺少 data 表单数据');
		}
		try {
			body = JSON.parse(rawData);
		} catch {
			throw error(400, '请求数据格式错误');
		}

		if (formData.has('main_image')) {
			const file = formData.get('main_image');
			if (file instanceof File && file.size > 0) {
				mainImageFile = file;
			} else if (file === '' || file === 'null' || file === null) {
				// Only meaningful on update; create passes null and ignores it.
				mainImageFile = 'CLEAR';
			}
		}

		// Per-variant gallery uploads: fields named `gallery:<sku>`.
		galleryUploads = extractGalleryUploads(formData);
	} else {
		try {
			body = await request.json();
		} catch {
			throw error(400, '请求格式错误');
		}
	}

	return { body, mainImageFile, galleryUploads };
}
