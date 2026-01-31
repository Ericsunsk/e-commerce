import { z } from 'zod';
import type {
	ProductVariantsResponse,
	ProductsResponse,
	GlobalSettingsResponse,
	NavigationResponse,
	PagesResponse,
	UiSectionsResponse,
	UiAssetsResponse,
	CategoriesResponse,
	OrdersResponse,
	OrderItemsResponse,
	CouponsResponse,
	UserListsResponse
} from './pocketbase-types';

// =============================================================================
// Core Zod Schemas & Types
// =============================================================================

// --- Category ---
export const CategorySchema = z.object({
	// Base fields
	id: z.string(),
	collectionId: z.string(),
	collectionName: z.string(),
	created: z.string(),
	updated: z.string(),

	title: z.string(),
	name: z.string().optional(),
	slug: z.string(),
	parent: z.string().optional(),

	// Some legacy code might expect name, let's include it if present in DB
	// or map it. For now, strict Zod schema based on usage.

	// Enhanced/Mapped fields
	isVisible: z.boolean().default(true),
	sortOrder: z.number().default(0),
	image: z.string().optional() // Resolved URL
});
// Pure Zod inference, no intersection with PB types to avoid brand type conflicts
export type Category = z.infer<typeof CategorySchema>;

// --- Product Variant ---
export const ProductVariantSchema = z.object({
	id: z.string(),
	collectionId: z.string(),
	collectionName: z.string(),

	product: z.string(),
	color: z.string(),
	size: z.string(),
	sku: z.string(),

	// Mapped
	image: z.string().optional(),
	stockQuantity: z.number().optional(), // alias
	priceOverride: z.number().optional() // alias
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

// --- Product ---
export const ProductSchema = z.object({
	// Base Identity
	id: z.string(),
	collectionId: z.string(),
	collectionName: z.string(),
	created: z.string(),
	updated: z.string(),

	// Core Data
	title: z.string(),
	slug: z.string(),
	description: z.string().optional(),

	// Frontend Specific / Computed
	price: z.string(), // Formatted "$100.00"
	priceValue: z.number(), // Raw 100.00
	image: z.string(), // Main image URL
	images: z.array(z.string()), // Gallery URLs

	variants: z.array(ProductVariantSchema).optional(),
	categories: z.array(CategorySchema).optional(),
	categoryIds: z.array(z.string()).optional(),

	attributes: z.record(z.string(), z.any()).optional(),

	// Status Flags
	isFeature: z.boolean(),
	hasVariants: z.boolean(),
	stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']).default('in_stock'),
	gender: z.enum(['mens', 'womens', 'unisex']).default('unisex'),

	stripePriceId: z.string().optional(),
	tag: z.string().optional()
});
export type Product = z.infer<typeof ProductSchema>;

// =============================================================================
// Site / Content Types
// =============================================================================

export type GlobalSettings = Omit<GlobalSettingsResponse, 'icon'> & {
	storyImage?: string;
	aboutHeroImage?: string;
	aboutSectionImage?: string;
	emptyWishlistImage?: string;
	icon?: string;
	shippingThreshold: number;
	currencyCode: string;
	currencySymbol: string;
	siteName: string;
	maintenanceMode: boolean;
};

export type NavItem = NavigationResponse & {
	isVisible: boolean;
	children?: NavItem[];
};

export type Page = Omit<PagesResponse, 'hero_image' | 'og_image'> & {
	metaDescription: string;
	ogImage?: string;
	heroImage?: string;
	// Legacy support
	hero_image?: string;
	og_image?: string;
};

export type SectionType =
	| 'hero'
	| 'feature_split'
	| 'product_grid'
	| 'category_grid'
	| 'rich_text'
	| 'cta_banner';

export interface UISectionAction {
	text: string;
	link: string;
	style?: 'primary' | 'outline' | 'text';
}

export interface UISectionSettings {
	actions?: UISectionAction[];
	external?: {
		image_url?: string;
		video_url?: string;
	};
	[key: string]: any;
}

export type UISection = Omit<UiSectionsResponse<UISectionSettings>, 'image' | 'video' | 'type'> & {
	pageId: string;
	type: SectionType;
	imageUrl?: string;
	videoUrl?: string;
	imageGallery?: string[];
	videoGallery?: string[];
	sortOrder: number;
	isActive: boolean;
	scheduleStart?: string;
	scheduleEnd?: string;
	image?: string[];
	video?: string;
};

export type UIAsset = Omit<UiAssetsResponse, 'image'> & {
	url: string;
	altText?: string;
	image?: string;
};

// =============================================================================
// Commerce / Order Types
// =============================================================================

export type OrderStatus =
	| 'pending'
	| 'paid'
	| 'processing'
	| 'shipped'
	| 'delivered'
	| 'cancelled'
	| 'refunded'
	| 'returned';

export type OrderItem = OrderItemsResponse & {
	productId: string;
	variantId?: string;
	title: string;
	price: number;
	image?: string;
	color?: string;
	size?: string;
};

export interface ShippingAddress {
	name: string;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postalCode: string;
	country: string;
}

export type Order = Omit<OrdersResponse<ShippingAddress>, 'status'> & {
	userId?: string;
	stripeSessionId: string;
	stripePaymentIntent?: string;
	customerEmail: string;
	customerName?: string;
	items: OrderItem[];
	amountSubtotal: number;
	amountShipping: number;
	amountTax?: number;
	amountTotal: number;
	status: OrderStatus;
	shippingAddress: ShippingAddress;
	trackingNumber?: string;
	trackingCarrier?: string;
};

export type Coupon = Omit<CouponsResponse, 'type'> & {
	type: 'percentage' | 'fixed_amount';
	expire_date?: string;
	min_order_amount?: number;
	usage_limit?: number;
	usage_count?: number;
};

// =============================================================================
// Cart & List Types (Zod Enhanced)
// =============================================================================

export const CartItemSchema = z.object({
	id: z.string(), // Product ID
	variantId: z.string().optional(),
	quantity: z.number().min(1),

	// Snapshot data (for UI display without refetching product)
	title: z.string().optional(),
	price: z.number().optional(),
	image: z.string().optional(),
	slug: z.string().optional(),

	color: z.string().optional(),
	size: z.string().optional(),

	stripePriceId: z.string().optional(),

	// Computed locally
	cartItemId: z.string().optional()
});
export type CartItem = z.infer<typeof CartItemSchema>;

export interface UserListItem {
	productId: string;
	variantId?: string;
	quantity: number;
}

export type UserList = UserListsResponse<UserListItem[]> & {
	userId: string;
};
