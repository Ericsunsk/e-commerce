/**
 * Shared System Constants
 */

export const DEFAULTS = {
	siteName: 'JEVARIE',
	currencySymbol: '$',
	currencyCode: 'USD',
	freeShippingThreshold: 300,
	demoEmail: 'demo@vanflow.com'
} as const;

export const CONTENT_IMAGES = {
	WISHLIST_EMPTY:
		'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2000&auto=format&fit=crop',
	CART_EMPTY:
		'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2000&auto=format&fit=crop',
	ABOUT_HERO:
		'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000&auto=format&fit=crop',
	ABOUT_SECTION:
		'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2000&auto=format&fit=crop',
	HOME_HERO:
		'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000&auto=format&fit=crop',
	HOME_STORY:
		'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000&auto=format&fit=crop',
	OG_DEFAULT:
		'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop'
} as const;

export const STORAGE_KEYS = {
	CART: 'vanflow_cart',
	WISHLIST: 'vanflow_wishlist'
} as const;

export const PLACEHOLDER_IMAGE = 'https://placehold.co/600x800/1a1a1a/1a1a1a?text=%20';
