import { z } from 'zod';

// =============================================================================
// Category Domain Model
// =============================================================================

export const CategorySchema = z.object({
	id: z.string(),
	collectionId: z.string(),
	collectionName: z.string(),
	title: z.string(),
	name: z.string().optional(),
	slug: z.string(),
	parent: z.string().optional(),
	isVisible: z.boolean().default(true),
	sortOrder: z.number().default(0),
	image: z.string().optional()
});

export type Category = z.infer<typeof CategorySchema>;

// =============================================================================
// Product Variant Domain Model
// =============================================================================

export const ProductVariantSchema = z.object({
	id: z.string(),
	collectionId: z.string(),
	collectionName: z.string(),
	product: z.string(),
	color: z.string(),
	colorSwatch: z.string().optional(),
	size: z.string(),
	sku: z.string(),
	stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
	galleryImages: z.array(z.string()).optional(),
	image: z.string().optional(),
	stockQuantity: z.number().optional()
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

// =============================================================================
// Product Domain Model
// =============================================================================

export const ProductSchema = z.object({
	id: z.string(),
	collectionId: z.string(),
	collectionName: z.string(),
	title: z.string(),
	slug: z.string(),
	description: z.string().optional(),
	price: z.string(), // Formatted "$100.00"
	priceValue: z.number(), // Numeric 100.00
	image: z.string(),
	images: z.array(z.string()),
	variants: z.array(ProductVariantSchema).optional(),
	categories: z.array(CategorySchema).optional(),
	categoryIds: z.array(z.string()).optional(),
	attributes: z.record(z.string(), z.any()).optional(),
	isFeature: z.boolean(),
	hasVariants: z.boolean(),
	stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']).default('in_stock'),
	gender: z.enum(['mens', 'womens', 'unisex']).default('unisex'),
	stripePriceId: z.string().optional(),
	tag: z.string().optional()
});

export type Product = z.infer<typeof ProductSchema>;
