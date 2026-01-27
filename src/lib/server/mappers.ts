/**
 * PocketBase Record Mappers
 * 统一的数据映射工具函数，用于将 PocketBase 记录转换为前端类型
 */

import { getFileUrl } from './pocketbase';
import type { Product, Category, ProductVariant } from '$lib/types';
import type { ProductsResponse, CategoriesResponse, ProductVariantsResponse } from '$lib/pocketbase-types';

// =============================================================================
// Gender Mapping
// =============================================================================

/**
 * Map database gender value to frontend type
 */
export function mapGender(dbGender: string): 'mens' | 'womens' | 'unisex' {
    if (dbGender === 'men' || dbGender === 'mens') return 'mens';
    if (dbGender === 'women' || dbGender === 'womens') return 'womens';
    return 'unisex';
}

// =============================================================================
// Product Mapping
// =============================================================================

/**
 * Map a PocketBase product record to frontend Product type
 */
export function mapRecordToProduct(record: ProductsResponse, categories?: Category[]): Product {
    const collectionId = record.collectionId || 'products';
    const recordId = record.id;

    const mainImage = record.main_image
        ? getFileUrl(collectionId, recordId, record.main_image)
        : '';

    const rawGallery = record.gallery_images || [];
    const galleryImages = Array.isArray(rawGallery)
        ? rawGallery.map((img) => getFileUrl(collectionId, recordId, img))
        : [];

    // Map Variants from Expanded Relation
    const expandedVariants = (record.expand as any)?.['product_variants(product)'] as ProductVariantsResponse[] | undefined;
    const variants = mapVariantsFromExpand(expandedVariants);

    // Handle categoryIds - can be string or array
    const rawCategoryIds = record.category;
    const categoryIds = Array.isArray(rawCategoryIds)
        ? rawCategoryIds
        : rawCategoryIds ? [rawCategoryIds] : [];

    // Derive gender from categories since it's no longer a direct field
    let gender: 'mens' | 'womens' | 'unisex' = 'unisex';
    if (categories) {
        if (categories.some(c => c.slug === 'mens' || c.slug === 'men')) gender = 'mens';
        else if (categories.some(c => c.slug === 'womens' || c.slug === 'women')) gender = 'womens';
    }

    // Omit attributes from spread to handle null-check manually
    // const { attributes, ...rest } = record;

    return {
        // Base Identity
        id: (record.slug || record.id),
        collectionId: collectionId,
        collectionName: record.collectionName,
        created: record.created,
        updated: record.updated,

        // Core Data
        title: record.title,
        slug: record.slug,
        description: record.description,

        // Frontend Specific / Computed
        price: "Loading...",
        priceValue: 0,
        image: mainImage,
        images: galleryImages.length > 0 ? galleryImages : [mainImage],
        
        variants: variants.length > 0 ? variants : undefined,
        categories: categories,
        categoryIds: categoryIds,
        
        attributes: (record.attributes as Record<string, any>) || {},

        // Status Flags
        isFeature: !!record.is_featured,
        hasVariants: !!record.has_variants,
        stockStatus: record.stock_status || 'in_stock',
        gender: gender,
        
        stripePriceId: record.stripe_price_id
        // tag: record.tag // Not in PB types yet
    };
}

/**
 * Map expanded variants from PocketBase relation
 */
export function mapVariantsFromExpand(expandedVariants: ProductVariantsResponse[] | undefined): ProductVariant[] {
    if (!expandedVariants) return [];

    return expandedVariants.map(v => ({
        id: v.id,
        collectionId: v.collectionId,
        collectionName: v.collectionName,
        
        product: v.product,
        color: v.color,
        size: v.size,
        sku: v.sku,

        // Mapped
        image: v.variant_image ? getFileUrl(v.collectionId, v.id, v.variant_image) : undefined,
        stockQuantity: v.stock_quantity,
        priceOverride: v.price_override
    }));
}

// =============================================================================
// Category Mapping
// =============================================================================

/**
 * Map a PocketBase category record to frontend Category type
 */
export function mapRecordToCategory(record: CategoriesResponse): Category {
    return {
        id: record.id,
        collectionId: record.collectionId,
        collectionName: record.collectionName,
        created: record.created,
        updated: record.updated,
        
        title: record.name,
        name: record.name,
        slug: record.slug,
        
        // Mapped fields
        image: record.image ? getFileUrl('categories', record.id, record.image) : undefined,
        isVisible: !!record.is_visible,
        sortOrder: record.sort_order || 0
    };
}

/**
 * Map expanded category from product record (single)
 */
export function mapCategoryFromExpand(expandedCategory: CategoriesResponse | undefined): Category | undefined {
    if (!expandedCategory) return undefined;

    return {
        id: expandedCategory.id,
        collectionId: expandedCategory.collectionId,
        collectionName: expandedCategory.collectionName,
        created: expandedCategory.created,
        updated: expandedCategory.updated,
        
        title: expandedCategory.name,
        slug: expandedCategory.slug,

        image: expandedCategory.image ? getFileUrl('categories', expandedCategory.id, expandedCategory.image) : undefined,
        isVisible: !!expandedCategory.is_visible,
        sortOrder: expandedCategory.sort_order || 0
    };
}

/**
 * Map expanded categories from product record (array - for multi-select)
 */
export function mapCategoriesFromExpand(expandedCategories: CategoriesResponse | CategoriesResponse[] | undefined): Category[] {
    if (!expandedCategories) return [];

    // Handle both single object and array
    const categoriesArray = Array.isArray(expandedCategories)
        ? expandedCategories
        : [expandedCategories];

    return categoriesArray
        .filter(c => c != null)
        .map(c => ({
            id: c.id,
            collectionId: c.collectionId,
            collectionName: c.collectionName,
            created: c.created,
            updated: c.updated,
            
            title: c.name,
            slug: c.slug,

            image: c.image ? getFileUrl('categories', c.id, c.image) : undefined,
            isVisible: !!c.is_visible,
            sortOrder: c.sort_order || 0
        }));
}
