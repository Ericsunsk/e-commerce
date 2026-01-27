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
    UserListsResponse,
    UserAddressesResponse
} from './pocketbase-types';

// =============================================================================
// Core Types
// =============================================================================

export type ProductVariant = ProductVariantsResponse & {
    image?: string; // Resolved URL
    stockQuantity?: number; // Alias for stock_quantity
    priceOverride?: number; // Alias for price_override
};

export type Product = Omit<ProductsResponse, 'attributes'> & {
    // Frontend-specific / Transformed fields
    price: string;        // Formatted price string
    priceValue: number;   // Raw numeric price
    image: string;        // Main image URL
    images: string[];     // All image URLs
    variants?: ProductVariant[];
    categories?: Category[]; // Resolved categories
    attributes?: Record<string, any>;
    
    // UI Helpers
    isFeature: boolean;   // mapped from is_featured?
    hasVariants: boolean; // mapped from has_variants
    
    // Mapped fields (renamed or computed)
    categoryIds?: string[];
    gender: 'mens' | 'womens' | 'unisex'; // derived
    stripePriceId?: string; // Alias for stripe_price_id
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock'; // Alias for stock_status
};

// =============================================================================
// Site Module Types
// =============================================================================

export type GlobalSettings = Omit<GlobalSettingsResponse, 'icon'> & {
    // Aggregated image assets
    storyImage?: string;
    aboutHeroImage?: string;
    aboutSectionImage?: string;
    emptyWishlistImage?: string;
    
    icon?: string; // Resolved URL
    
    // Alias for camelCase usage if needed, but try to use snake_case from DB
    shippingThreshold: number; // Alias for shipping_threshold
    currencyCode: string;      // Alias for currency_code
    currencySymbol: string;    // Alias for currency_symbol
    siteName: string;          // Alias for site_name
    maintenanceMode: boolean;  // Alias for maintenance_mode
};

export type NavItem = NavigationResponse & {
    isVisible: boolean; // mapped from is_visible
    children?: NavItem[];
};

// =============================================================================
// Content Module Types
// =============================================================================

export type Page = Omit<PagesResponse, 'hero_image' | 'og_image'> & {
    metaDescription: string; // mapped from meta_description
    ogImage?: string;        // mapped from og_image (URL)
    heroImage?: string;      // mapped from hero_image (URL)
    
    // Keep raw filenames if needed, but usually we use mapped camelCase
    hero_image?: string; // Optional raw
    og_image?: string;
};

export type SectionType = 'hero' | 'feature_split' | 'product_grid' | 'category_grid' | 'rich_text' | 'cta_banner';

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
    pageId: string; // mapped from page
    type: SectionType; // Override with string union
    imageUrl?: string;
    videoUrl?: string;
    imageGallery?: string[];
    videoGallery?: string[];
    sortOrder: number; // mapped from sort_order
    isActive: boolean; // mapped from is_active
    scheduleStart?: string; // mapped from schedule_start
    scheduleEnd?: string;   // mapped from schedule_end
    
    // Raw fields override (optional)
    image?: string[]; // Raw filenames
    video?: string;   // Raw filename
};

export type UIAsset = Omit<UiAssetsResponse, 'image'> & {
    url: string;
    altText?: string; // mapped from alt_text
    image?: string; // Raw filename
};

// =============================================================================
// Commerce Module Types
// =============================================================================

export type Category = Omit<CategoriesResponse, 'image'> & {
    isVisible: boolean; // mapped from is_visible
    sortOrder: number;  // mapped from sort_order
    image?: string;     // URL resolved
};

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'returned';

export type OrderItem = OrderItemsResponse & {
    productId: string; // mapped from product_id
    variantId?: string; // mapped from variant_id
    title: string;      // mapped from product_title_snap
    price: number;      // mapped from price_snap
    // ... extra fields potentially
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

export type Order = OrdersResponse<ShippingAddress> & {
    userId?: string; // mapped from user
    stripeSessionId: string; // mapped from stripe_session_id
    stripePaymentIntent?: string; // mapped from stripe_payment_intent
    customerEmail: string; // mapped from customer_email
    customerName?: string; // mapped from customer_name
    items: OrderItem[];
    amountSubtotal: number; // mapped from amount_subtotal
    amountShipping: number; // mapped from amount_shipping
    amountTax?: number;
    amountTotal: number; // mapped from amount_total
    shippingAddress: ShippingAddress; // mapped from shipping_address
    trackingNumber?: string; // mapped from tracking_number
    trackingCarrier?: string; // mapped from tracking_carrier
};

// =============================================================================
// Marketing Module Types
// =============================================================================

export type Coupon = Omit<CouponsResponse, 'type'> & {
    type: 'percentage' | 'fixed_amount';
    expire_date?: string;
    min_order_amount?: number;
    usage_limit?: number;
    usage_count?: number;
};


// =============================================================================
// System Module Types - User Lists (Cart, Wishlist, etc.)
// =============================================================================

export interface CartItem {
    id: string; // Product ID
    variantId?: string;
    quantity: number;
    title?: string;
    price?: number; // Store as number for calculation
    image?: string;
    slug?: string;
    stripePriceId?: string;
    color?: string;
    size?: string;
    // Add cartItemId for composite key
    cartItemId?: string; 
}

export interface UserListItem {
    productId: string;
    variantId?: string;
    quantity: number;
}

export type UserList = UserListsResponse<UserListItem[]> & {
    userId: string; // mapped from user
};
