import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPage, getPageSections } from '$lib/server/content';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;

	try {
		// 1. 获取页面元数据
		const page = await getPage(slug);

		if (!page) {
			throw error(404, 'Page not found');
		}

		// 2. 获取页面关联的动态区块 (使用 slug 而非 id)
		const sections = await getPageSections(page.slug);

		return {
			page,
			sections
		};
	} catch (e) {
		console.error(`Error loading page ${slug}:`, e);
		throw error(404, 'Page not found');
	}
};
