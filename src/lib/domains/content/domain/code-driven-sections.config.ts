import { Collections } from '$shared/infrastructure/pocketbase-types';
import type { UISection, SectionType, UISectionSettings } from './models';

function createCodeSection(data: {
	id: string;
	pageId: string;
	type: SectionType;
	heading?: string;
	subheading?: string;
	content?: string;
	imageUrl?: string;
	sortOrder: number;
	isActive: boolean;
	settings?: UISectionSettings;
}): UISection {
	return {
		collectionId: 'code_driven',
		collectionName: Collections.UiSections,
		id: data.id,
		page: data.pageId,
		pageId: data.pageId,
		type: data.type,
		heading: data.heading || '',
		subheading: data.subheading || '',
		content: data.content || '',
		sort_order: data.sortOrder,
		sortOrder: data.sortOrder,
		is_active: data.isActive,
		isActive: data.isActive,
		imageUrl: data.imageUrl || '',
		schedule_start: '',
		schedule_end: '',
		settings: data.settings || {}
	};
}

/**
 * Code-driven visual layout sections for high-fashion boutique storefront.
 * When CMS sections are disabled or empty, the site seamlessly renders these
 * finely-tuned, type-safe visual sections.
 */
export const CODE_DRIVEN_SECTIONS: Record<string, UISection[]> = {
	home: [
		createCodeSection({
			id: 'code-hero-1',
			pageId: 'home',
			type: 'hero',
			heading: 'AUTUMN / WINTER 2026',
			subheading: 'NEW ARRIVALS · ELEVATED ATELIER',
			content: 'Explore refined silhouettes sculpted from sustainable Italian virgin wool and architectural cuts.',
			imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop',
			sortOrder: 10,
			isActive: true,
			settings: {
				actions: [
					{ text: 'EXPLORE COLLECTION', link: '/collection', style: 'primary' },
					{ text: 'SHOP ALL', link: '/shop', style: 'outline' }
				]
			}
		}),
		createCodeSection({
			id: 'code-split-2',
			pageId: 'home',
			type: 'split_showcase',
			heading: 'WOMENS ATELIER',
			subheading: 'MENS CURATION',
			content: 'Curated seasonal ensembles designed for understated modern luxury.',
			imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop',
			sortOrder: 20,
			isActive: true,
			settings: {
				split_showcase: {
					left: {
						title: 'WOMEN',
						link: '/shop?gender=womens',
						imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop'
					},
					right: {
						title: 'MEN',
						link: '/shop?gender=mens',
						imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop'
					}
				}
			}
		}),
		createCodeSection({
			id: 'code-category-3',
			pageId: 'home',
			type: 'category_grid',
			heading: 'CURATED DISCIPLINES',
			subheading: 'TIMELESS ESSENTIALS',
			content: 'From hand-finished outerwear to structured leather accessories and footwear.',
			sortOrder: 30,
			isActive: true,
			settings: {
				category_grid: {
					cards: [
						{ title: 'OUTERWEAR', link: '/shop?category=outerwear' },
						{ title: 'LEATHER GOODS', link: '/shop?category=leather' },
						{ title: 'FOOTWEAR', link: '/shop?category=shoes' },
						{ title: 'ACCESSORIES', link: '/shop?category=accessories' }
					]
				}
			}
		}),
		createCodeSection({
			id: 'code-cta-4',
			pageId: 'home',
			type: 'cta_banner',
			heading: 'COMPLIMENTARY WORLDWIDE DELIVERY',
			subheading: 'ATELIER PRIVILEGE',
			content: 'Enjoy complimentary express courier shipping and signature gift wrapping on all orders.',
			sortOrder: 40,
			isActive: true,
			settings: {
				actions: [
					{ text: 'JOIN PRIVILEGE', link: '/account', style: 'primary' }
				]
			}
		})
	],
	collection: [
		createCodeSection({
			id: 'code-collection-hero',
			pageId: 'collection',
			type: 'hero',
			heading: 'THE PERMANENT ARCHIVE',
			subheading: 'SIGNATURE PIECES',
			content: 'Timeless garments crafted to transcend seasonal cycles with meticulous craftsmanship.',
			imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1600&auto=format&fit=crop',
			sortOrder: 10,
			isActive: true,
			settings: {
				actions: [
					{ text: 'DISCOVER ALL', link: '/shop', style: 'primary' }
				]
			}
		})
	]
};
