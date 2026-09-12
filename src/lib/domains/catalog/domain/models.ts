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
	description: z.string().optional(),
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
	stockQuantity: z.number().optional(),
	/**
	 * Variant-level selling price in dollars, from the product's
	 * `attributes.variant_pricing` map (keyed by SKU). `undefined` means the
	 * variant inherits the product-level price — checkout falls back to
	 * `Product.priceValue`.
	 */
	price: z.number().optional(),
	/** Optional strikethrough original price for this variant, in dollars. */
	compareAt: z.number().optional()
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

// =============================================================================
// Product Attributes
// =============================================================================

/**
 * Per-SKU price overrides, keyed by variant SKU. This is the money contract
 * checkout reads, so it is typed rather than left in the open-ended bag below.
 */
export const VariantPricingSchema = z.record(
	z.string(),
	z.object({
		price: z.number().optional(),
		compareAt: z.number().optional()
	})
);

export type VariantPricing = z.infer<typeof VariantPricingSchema>;

/**
 * The `attributes` JSON bag: one column holding every product-level extra that
 * has no PocketBase schema of its own (so no migration is needed to add one).
 *
 * Typed — not `z.any()` — so the handful of keys that carry real contracts
 * (pricing, and the storefront's display fields) have a single owner instead of
 * each consumer re-deriving the shape. `passthrough` keeps unknown keys valid:
 * the column is intentionally open-ended, and dropping them would silently
 * destroy data written by other tools.
 */
export const ProductAttributesSchema = z
	.object({
		/** Strikethrough original price, dollars. Same unit as `priceValue`. */
		compare_at_price: z.union([z.number(), z.string()]).optional(),
		/** Per-SKU selling-price overrides. */
		variant_pricing: VariantPricingSchema.optional(),
		/** Long-form product copy, rendered as a list on the PDP. */
		material: z.string().optional(),
		care: z.string().optional(),
		details: z.array(z.string()).optional(),
		shipping: z.string().optional(),
		/** Gallery facets; variants are the usual source, these are the fallback. */
		colors: z.array(z.string()).optional(),
		sizes: z.array(z.string()).optional()
	})
	.passthrough();

export type ProductAttributes = z.infer<typeof ProductAttributesSchema>;

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
	attributes: ProductAttributesSchema.optional(),
	isFeature: z.boolean(),
	hasVariants: z.boolean(),
	stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']).default('in_stock'),
	gender: z.enum(['mens', 'womens', 'unisex']).default('unisex'),
	stripePriceId: z.string().optional(),
	tag: z.string().optional()
});

export type Product = z.infer<typeof ProductSchema>;
