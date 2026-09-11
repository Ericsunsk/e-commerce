/**
 * PocketBase Record Mappers for Catalog Domain
 */

import { getFileUrl } from '$shared/kernel';
import { computeStockStatus } from '../domain/stock-status';
import type { Product, Category, ProductVariant } from '../domain/models';
import type {
	ProductsResponse,
	CategoriesResponse,
	ProductVariantsResponse
} from '$shared/infrastructure';

export function mapGender(dbGender: string): 'mens' | 'womens' | 'unisex' {
	if (dbGender === 'men' || dbGender === 'mens') return 'mens';
	if (dbGender === 'women' || dbGender === 'womens') return 'womens';
	return 'unisex';
}

export function mapRecordToProduct(record: ProductsResponse, categories?: Category[]): Product {
	const collectionId = record.collectionId || 'products';
	const recordId = record.id;

	const mainImage = record.main_image ? getFileUrl(collectionId, recordId, record.main_image) : '';

	type ProductExpand = { 'product_variants(product)'?: ProductVariantsResponse[] };
	const expandedVariants = (record.expand as unknown as ProductExpand | undefined)?.[
		'product_variants(product)'
	];
	const rawVariants = mapVariantsFromExpand(expandedVariants);

	const mediaByColor = new Map<
		string,
		{
			image?: string;
			galleryImages: string[];
		}
	>();
	for (const v of rawVariants) {
		const galleryImages = Array.isArray(v.galleryImages) ? v.galleryImages.filter(Boolean) : [];
		const image = v.image || galleryImages[0] || undefined;
		if (!image && galleryImages.length === 0) continue;

		const existing = mediaByColor.get(v.color);
		if (!existing) {
			mediaByColor.set(v.color, { image, galleryImages });
			continue;
		}

		const existingGalleryLen = existing.galleryImages?.length || 0;
		if (galleryImages.length > existingGalleryLen) {
			mediaByColor.set(v.color, { image, galleryImages });
			continue;
		}
		if (!existing.image && image) {
			mediaByColor.set(v.color, { image, galleryImages: existing.galleryImages });
		}
	}

	const variants = rawVariants.map((v) => {
		const media = mediaByColor.get(v.color);
		if (!media) return v;

		const hasGallery = Array.isArray(v.galleryImages) && v.galleryImages.length > 0;
		const galleryImages = hasGallery
			? v.galleryImages
			: media.galleryImages.length > 0
				? media.galleryImages
				: v.galleryImages;
		const image = v.image || media.image || galleryImages?.[0] || undefined;

		return {
			...v,
			galleryImages,
			image
		};
	});

	const hasVariants = variants.length > 0;

	const firstVariant = variants[0];
	const firstVariantImage = firstVariant?.image || firstVariant?.galleryImages?.[0] || '';
	const baseImage = firstVariantImage || mainImage;
	const baseImages = baseImage ? [baseImage] : [];

	const totalVariantStock = variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
	const stockStatus = hasVariants ? computeStockStatus(totalVariantStock) : 'out_of_stock';

	const rawCategoryIds = record.category;
	const categoryIds = Array.isArray(rawCategoryIds)
		? rawCategoryIds
		: rawCategoryIds
			? [rawCategoryIds]
			: [];

	type CategoryExpand = { category?: CategoriesResponse[] | CategoriesResponse };
	const expandedCats = (record.expand as unknown as CategoryExpand | undefined)?.category;
	const resolvedCategories = categories && categories.length > 0 ? categories : mapCategoriesFromExpand(expandedCats);

	let gender: 'mens' | 'womens' | 'unisex' = 'unisex';
	if (resolvedCategories && resolvedCategories.length > 0) {
		if (resolvedCategories.some((c) => c.slug === 'mens' || c.slug === 'men')) gender = 'mens';
		else if (resolvedCategories.some((c) => c.slug === 'womens' || c.slug === 'women')) gender = 'womens';
	}

	return {
		id: record.slug || record.id,
		collectionId: collectionId,
		collectionName: record.collectionName,
		title: record.title,
		slug: record.slug,
		description: record.description,
		price: 'Loading...',
		priceValue: 0,
		image: baseImage,
		images: baseImages,
		variants: hasVariants ? variants : undefined,
		categories: resolvedCategories,
		categoryIds: categoryIds,
		attributes: (record.attributes as Record<string, unknown>) || {},
		isFeature: !!record.is_featured,
		hasVariants: hasVariants,
		stockStatus: stockStatus,
		gender: gender,
		stripePriceId: record.stripe_price_id
	};
}

export function mapVariantsFromExpand(
	expandedVariants: ProductVariantsResponse[] | undefined
): ProductVariant[] {
	if (!expandedVariants) return [];

	return expandedVariants.map((v) => {
		const galleryImages: string[] = Array.isArray(v.gallery_images)
			? v.gallery_images.map((img) => getFileUrl(v.collectionId, v.id, img))
			: [];
		const image = galleryImages[0] || undefined;

		return {
			id: v.id,
			collectionId: v.collectionId,
			collectionName: v.collectionName,
			product: v.product,
			color: v.color,
			colorSwatch: v.color_swatch || undefined,
			size: v.size,
			sku: v.sku,
			galleryImages,
			stockStatus: computeStockStatus(Number(v.stock_quantity) || 0),
			image,
			stockQuantity: v.stock_quantity
		};
	});
}

export function mapRecordToCategory(record: CategoriesResponse): Category {
	return {
		id: record.id,
		collectionId: record.collectionId,
		collectionName: record.collectionName,
		title: record.name,
		name: record.name,
		slug: record.slug,
		image: record.image ? getFileUrl('categories', record.id, record.image) : undefined,
		isVisible: !!record.is_visible,
		sortOrder: record.sort_order || 0,
		description: record.description
	};
}

export function mapCategoriesFromExpand(
	expandedCategories: CategoriesResponse | CategoriesResponse[] | undefined
): Category[] {
	if (!expandedCategories) return [];

	const categoriesArray = Array.isArray(expandedCategories)
		? expandedCategories
		: [expandedCategories];

	return categoriesArray
		.filter((c) => c != null)
		.map((c) => ({
			id: c.id,
			collectionId: c.collectionId,
			collectionName: c.collectionName,
			title: c.name,
			slug: c.slug,
			image: c.image ? getFileUrl('categories', c.id, c.image) : undefined,
			isVisible: !!c.is_visible,
			sortOrder: c.sort_order || 0,
			description: c.description
		}));
}
