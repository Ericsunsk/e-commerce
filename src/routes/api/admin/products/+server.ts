import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCatalogProduct } from '$domains/catalog/server';
import { getErrorStatus } from '$shared/infrastructure/server';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.admin) {
		throw error(401, '需要管理员登录');
	}

	const contentType = request.headers.get('content-type') || '';
	let body: unknown;
	let mainImageFile: File | null = null;

	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();
		const rawData = formData.get('data');
		if (typeof rawData === 'string') {
			try {
				body = JSON.parse(rawData);
			} catch {
				throw error(400, '请求数据格式错误');
			}
		} else {
			throw error(400, '缺少 data 表单数据');
		}
		const file = formData.get('main_image');
		if (file instanceof File && file.size > 0) {
			mainImageFile = file;
		}
	} else {
		try {
			body = await request.json();
		} catch {
			throw error(400, '请求格式错误');
		}
	}

	try {
		const product = await createCatalogProduct(body, mainImageFile);
		return json({ success: true, product }, { status: 201 });
	} catch (err: unknown) {
		const status = getErrorStatus(err) ?? 500;
		const message =
			typeof err === 'object' && err !== null && 'message' in err
				? String((err as { message: unknown }).message)
				: '创建商品失败';
		throw error(status, message);
	}
};
