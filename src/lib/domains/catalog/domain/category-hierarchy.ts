/**
 * Pure domain classification for categories into hierarchical tiers.
 * Tiers:
 * 1. Gender / Audience (人群 / 性别): Mens, Womens, Unisex, Kids...
 * 2. Primary / Department (一级品类): Tops, Bottoms, Outerwear, Footwear, Accessories...
 * 3. Subcategories / Product Types (细分子类): Hoodies, Pants, Shoes, T-Shirts, Sweaters...
 * 4. Other (其他类目): Custom categories not matched above.
 */

export type CategoryHierarchyTier = 'gender' | 'primary' | 'subcategory' | 'other';

export interface CategoryTierMeta {
	id: CategoryHierarchyTier;
	label: string;
	description: string;
	order: number;
}

export const CATEGORY_TIER_DEFINITIONS: Record<CategoryHierarchyTier, CategoryTierMeta> = {
	gender: {
		id: 'gender',
		label: '人群 / 性别',
		description: '商品定位受众群体',
		order: 1
	},
	primary: {
		id: 'primary',
		label: '一级品类',
		description: '服饰主类目归属',
		order: 2
	},
	subcategory: {
		id: 'subcategory',
		label: '细分子类',
		description: '细分款式或版型',
		order: 3
	},
	other: {
		id: 'other',
		label: '其他类目',
		description: '通用或扩展分类',
		order: 4
	}
};

const GENDER_SLUGS = new Set([
	'mens',
	'womens',
	'unisex',
	'kids',
	'children',
	'men',
	'women',
	'boys',
	'girls',
	'baby',
	'infant'
]);

const PRIMARY_SLUGS = new Set([
	'tops',
	'bottoms',
	'outerwear',
	'footwear',
	'accessories',
	'bags',
	'apparel',
	'clothing',
	'shoes-all',
	'jewelry',
	'beauty',
	'home'
]);

const SUBCATEGORY_SLUGS = new Set([
	// Tops subcategories
	'hoodies',
	'hoodie',
	't-shirts',
	't-shirt',
	'tees',
	'tee',
	'shirts',
	'shirt',
	'sweaters',
	'sweater',
	'sweatshirts',
	'sweatshirt',
	'knitwear',
	'polos',
	'polo',
	'tanks',
	'tank',
	'tank-tops',
	'vests',
	'vest',
	'blouses',
	'blouse',
	// Bottoms subcategories
	'pants',
	'jeans',
	'shorts',
	'trousers',
	'sweatpants',
	'skirts',
	'skirt',
	'leggings',
	'denim',
	'cargo-pants',
	'cargos',
	'joggers',
	// Outerwear subcategories
	'jackets',
	'jacket',
	'coats',
	'coat',
	'parkas',
	'parka',
	'blazers',
	'blazer',
	'windbreakers',
	'bombers',
	'down-jackets',
	'trenches',
	// Footwear subcategories
	'shoes',
	'sneakers',
	'boots',
	'sandals',
	'loafers',
	'slides',
	'heels',
	'flats',
	'slippers',
	'mules',
	// Accessories subcategories
	'hats',
	'hat',
	'caps',
	'cap',
	'beanies',
	'beanie',
	'belts',
	'belt',
	'scarves',
	'scarf',
	'gloves',
	'socks',
	'wallets',
	'wallet',
	'sunglasses',
	'ties',
	'watches',
	'watch',
	'rings',
	'ring',
	'necklaces',
	'necklace',
	'bracelets',
	'bracelet',
	'earrings'
]);

/**
 * Determine the hierarchy tier of a category by slug, name, or explicit parent.
 */
export function getCategoryTier(category: {
	name?: string;
	slug?: string;
	parent?: string;
}): CategoryHierarchyTier {
	if (category.parent && category.parent.trim().length > 0) {
		return 'subcategory';
	}

	const slug = (category.slug || '').trim().toLowerCase();
	const name = (category.name || '').trim().toLowerCase();

	if (GENDER_SLUGS.has(slug) || /^(mens?|womens?|unisex|kids?|男装|女装|童装|男士|女士)$/i.test(name)) {
		return 'gender';
	}

	if (PRIMARY_SLUGS.has(slug) || /^(tops?|bottoms?|outerwear|footwear|accessories|bags?|上装|下装|外套|鞋履|配饰)$/i.test(name)) {
		return 'primary';
	}

	if (SUBCATEGORY_SLUGS.has(slug) || /卫衣|长裤|短裤|夹克|大衣|风衣|板鞋|球鞋|衬衫|针织/i.test(name)) {
		return 'subcategory';
	}

	return 'other';
}

export interface CategoryTierGroup<T> {
	id: CategoryHierarchyTier;
	label: string;
	description: string;
	categories: T[];
}

/**
 * Group and order categories into hierarchical rows.
 * Only returns tiers that contain at least one category.
 */
export function groupCategoriesByHierarchy<
	T extends { id: string; name?: string; slug?: string; parent?: string; sortOrder?: number; sort_order?: number }
>(categories: T[]): CategoryTierGroup<T>[] {
	if (!categories || categories.length === 0) return [];

	const groups: Record<CategoryHierarchyTier, T[]> = {
		gender: [],
		primary: [],
		subcategory: [],
		other: []
	};

	for (const cat of categories) {
		const tier = getCategoryTier(cat);
		groups[tier].push(cat);
	}

	const orderTiers: CategoryHierarchyTier[] = ['gender', 'primary', 'subcategory', 'other'];
	const result: CategoryTierGroup<T>[] = [];

	for (const tierId of orderTiers) {
		const items = groups[tierId];
		if (items.length > 0) {
			// Sort items within each tier by sortOrder if available
			items.sort((a, b) => {
				const orderA = a.sortOrder ?? a.sort_order ?? 0;
				const orderB = b.sortOrder ?? b.sort_order ?? 0;
				if (orderA !== orderB) return orderA - orderB;
				return (a.name || a.slug || '').localeCompare(b.name || b.slug || '');
			});

			result.push({
				...CATEGORY_TIER_DEFINITIONS[tierId],
				categories: items
			});
		}
	}

	return result;
}
