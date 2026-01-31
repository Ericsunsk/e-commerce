import { pb, getFileUrl } from './pocketbase';
import type { GlobalSettings, NavItem } from '$lib/types';
import { DEFAULTS, CONTENT_IMAGES } from '$lib/constants';
import { Collections } from '$lib/pocketbase-types';
import { withAdmin } from '$lib/server/admin';

// =============================================================================
// Site Module - Global Settings & Navigation
// =============================================================================

import { getAssetUrl } from './content';

export async function getGlobalSettings(): Promise<GlobalSettings> {
	const fallbackBase = {
		id: 'fallback_settings',
		collectionId: 'fallback',
		collectionName: Collections.GlobalSettings,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		// DB fields
		site_name: DEFAULTS.siteName,
		currency_symbol: DEFAULTS.currencySymbol,
		currency_code: DEFAULTS.currencyCode,
		shipping_threshold: DEFAULTS.freeShippingThreshold,
		maintenance_mode: false,
		icon: ''
	};

	const fallback: GlobalSettings = {
		...fallbackBase,
		// Aliases
		siteName: DEFAULTS.siteName,
		currencySymbol: DEFAULTS.currencySymbol,
		currencyCode: DEFAULTS.currencyCode,
		shippingThreshold: DEFAULTS.freeShippingThreshold,
		maintenanceMode: false,
		// Assets
		storyImage: CONTENT_IMAGES.HOME_STORY,
		aboutHeroImage: CONTENT_IMAGES.ABOUT_HERO,
		aboutSectionImage: CONTENT_IMAGES.ABOUT_SECTION,
		emptyWishlistImage: CONTENT_IMAGES.WISHLIST_EMPTY
	};

	return withAdmin(async (pb) => {
		const [settingsResult, storyImg, aboutHeroImg, aboutSectionImg, emptyWishlistImg] =
			await Promise.all([
				pb.collection(Collections.GlobalSettings).getList(1, 1),
				getAssetUrl('home_story', CONTENT_IMAGES.HOME_STORY),
				getAssetUrl('about_hero', CONTENT_IMAGES.ABOUT_HERO),
				getAssetUrl('about_section', CONTENT_IMAGES.ABOUT_SECTION),
				getAssetUrl('wishlist_empty', CONTENT_IMAGES.WISHLIST_EMPTY)
			]);

		let settings = { ...fallback };

		// Apply DB settings if available
		if (settingsResult.items.length > 0) {
			const r = settingsResult.items[0];
			settings = {
				...settings,
				...r, // Spread DB record to satisfy GlobalSettingsResponse
				siteName: r.site_name || fallback.siteName,
				currencySymbol: r.currency_symbol || fallback.currencySymbol,
				currencyCode: r.currency_code || fallback.currencyCode,
				shippingThreshold: r.shipping_threshold || fallback.shippingThreshold,
				maintenanceMode: r.maintenance_mode ?? fallback.maintenanceMode,
				icon: r.icon ? getFileUrl(r.collectionId, r.id, r.icon) : ''
			};
		}

		// Apply assets (fetched or fallback)
		settings.storyImage = storyImg;
		settings.aboutHeroImage = aboutHeroImg;
		settings.aboutSectionImage = aboutSectionImg;
		settings.emptyWishlistImage = emptyWishlistImg;

		return settings;
	}, fallback);
}

export async function getNavigation(location?: 'header' | 'footer' | 'mobile'): Promise<NavItem[]> {
	const fallbackBase = {
		collectionId: 'fallback',
		collectionName: Collections.Navigation,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		is_visible: true,
		parent: ''
	};

	const fallbackNav = [
		{
			...fallbackBase,
			id: '1',
			location: 'header',
			label: 'Collection',
			url: '/collection',
			order: 1,
			isVisible: true
		},
		{
			...fallbackBase,
			id: '2',
			location: 'header',
			label: 'Mens',
			url: '/shop?gender=mens',
			order: 2,
			isVisible: true
		},
		{
			...fallbackBase,
			id: '3',
			location: 'header',
			label: 'Womens',
			url: '/shop?gender=womens',
			order: 3,
			isVisible: true
		},
		{
			...fallbackBase,
			id: '4',
			location: 'header',
			label: 'Accessories',
			url: '/shop?category=accessories',
			order: 4,
			isVisible: true
		}
	] as NavItem[];

	return withAdmin(async (pb) => {
		const filter = location ? `location="${location}" && is_visible=true` : 'is_visible=true';
		const records = await pb.collection(Collections.Navigation).getFullList({
			filter,
			sort: 'order'
		});

		const items: NavItem[] = records.map((r) => ({
			...r, // Spread original record
			id: r.id,
			location: r.location,
			label: r.label,
			url: r.url,
			order: r.order,
			isVisible: r.is_visible,
			children: undefined
		}));

		// Build tree structure for nested navigation
		const rootItems = items.filter((item) => !item.parent);
		rootItems.forEach((item) => {
			item.children = items.filter((child) => child.parent === item.id);
		});

		return rootItems;
	}, fallbackNav);
}
