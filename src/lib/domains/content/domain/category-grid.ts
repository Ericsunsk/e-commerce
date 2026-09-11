import type { Category } from '$domains/catalog';
import type { UISection, UIAsset } from './models';

export interface CategoryGridDisplayItem {
	name: string;
	link: string;
	image: string;
}

export function resolveCategoryGridItems(options: {
	section?: UISection;
	categories?: Category[];
	assets?: UIAsset[];
}): CategoryGridDisplayItem[] {
	const { section, categories = [], assets = [] } = options;

	// 1. 优先读取 section.settings.items (运营后台自定义卡片列表)
	const customItems = section?.settings?.items;
	if (Array.isArray(customItems) && customItems.length > 0) {
		return customItems.map((item) => ({
			name: item.title || 'Collection',
			link: item.link || '/shop',
			image: item.imageUrl || ''
		}));
	}

	// 2. 动态商品品类 (只展示 isVisible 为 true 的分类)
	const validCategories = categories.filter((c) => c.isVisible !== false);
	if (validCategories.length > 0) {
		return validCategories.slice(0, 6).map((c) => ({
			name: c.title || c.name || c.slug.toUpperCase(),
			link: `/shop?category=${c.slug}`,
			image: c.image || ''
		}));
	}

	// 3. 兜底（老 assets 兼容）
	const legacyKeys = [
		{ name: 'ACCESSORIES', link: '/shop?category=accessories', key: 'hero_category_accessories' },
		{ name: 'COLLECTION', link: '/collection', key: 'hero_category_womens' },
		{ name: 'SHOP ALL', link: '/shop', key: 'hero_category_mens' }
	];
	return legacyKeys.map((item) => {
		const asset = assets.find((a) => a.key === item.key);
		return {
			name: item.name,
			link: item.link,
			image: asset?.url || ''
		};
	});
}

export function getCategoryGridClass(itemCount: number): string {
	if (itemCount === 2) return 'grid-cols-1 md:grid-cols-2';
	if (itemCount === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
	return 'grid-cols-1 md:grid-cols-3';
}
