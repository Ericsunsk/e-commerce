import type {
	GlobalSettingsResponse,
	NavigationResponse,
	PagesResponse,
	UiSectionsResponse,
	UiAssetsResponse
} from '$shared/infrastructure/pocketbase-types';

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
	hero_image?: string;
	og_image?: string;
};

export type SectionType =
	| 'hero'
	| 'feature_split'
	| 'product_grid'
	| 'category_grid'
	| 'rich_text'
	| 'cta_banner'
	| 'split_showcase';

export interface UISectionAction {
	text: string;
	link: string;
	style?: 'primary' | 'outline' | 'text';
}

export interface CategoryCardSetting {
	title?: string;
	link?: string;
	imageUrl?: string;
	categoryId?: string;
}

export interface SplitShowcasePanel {
	title?: string;
	link?: string;
	imageUrl?: string;
	position?: 'left' | 'right';
}

export interface UISectionSettings {
	actions?: UISectionAction[];
	external?: {
		image_url?: string;
		video_url?: string;
	};
	reverse?: boolean;
	align?: 'left' | 'center' | 'right';
	style?: string;
	columns?: number;
	items?: CategoryCardSetting[];
	panels?: SplitShowcasePanel[];
	[key: string]: unknown;
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
