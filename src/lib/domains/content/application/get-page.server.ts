import {
	getFileUrl,
	resolvePocketBaseImage,
	resolvePocketBaseGallery,
	isValidSlug
} from '$shared/kernel';
import { pb, sanitizeCmsHtml } from '$shared/infrastructure/server';
import {
	Collections,
	type UiSectionsResponse,
	type UiAssetsResponse
} from '$shared/infrastructure';
import type { Page, UISection, UIAsset, SectionType, UISectionSettings } from '../domain/models';
import { CODE_DRIVEN_SECTIONS } from '../domain/code-driven-sections.config';

export async function getPage(slug: string): Promise<Page | null> {
	if (!isValidSlug(slug)) {
		return null;
	}

	try {
		const record = await pb.collection(Collections.Pages).getFirstListItem(`slug="${slug}"`);
		return {
			...record,
			id: record.id,
			slug: record.slug,
			title: record.title || '',
			metaDescription: record.meta_description || '',
			ogImage: record.og_image
				? getFileUrl(record.collectionId, record.id, record.og_image)
				: undefined,
			heroImage: record.hero_image
				? getFileUrl(record.collectionId, record.id, record.hero_image)
				: undefined,
			content: sanitizeCmsHtml(record.content)
		};
	} catch (_e) {
		return null;
	}
}

export async function getPageSections(pageSlug: string): Promise<UISection[]> {
	try {
		const page = await pb.collection(Collections.Pages).getFirstListItem(`slug="${pageSlug}"`);

		const records = await pb
			.collection(Collections.UiSections)
			.getFullList<UiSectionsResponse<UISectionSettings>>({
				filter: `page="${page.id}" && is_active=true`,
				sort: 'sort_order'
			});

		if (!records.length) {
			return CODE_DRIVEN_SECTIONS[pageSlug] || [];
		}

		return records.map((r) => {
			const settings = (r.settings || {}) as UISectionSettings;

			let imageUrl = resolvePocketBaseImage(r, 'image', '');
			if (!imageUrl && settings.external?.image_url) {
				imageUrl = settings.external.image_url;
			}

			let videoUrl = resolvePocketBaseImage(r, 'video', '');
			if (!videoUrl && settings.external?.video_url) {
				videoUrl = settings.external.video_url;
			}

			return {
				...r,
				id: r.id,
				pageId: r.page,
				type: r.type as SectionType,
				heading: r.heading || '',
				subheading: r.subheading || '',
				content: sanitizeCmsHtml(r.content),
				imageUrl,
				videoUrl,
				imageGallery: resolvePocketBaseGallery(r, 'image'),
				videoGallery: resolvePocketBaseGallery(r, 'video'),
				settings,
				sortOrder: r.sort_order || 0,
				isActive: r.is_active ?? true
			};
		});
	} catch (_e) {
		return CODE_DRIVEN_SECTIONS[pageSlug] || [];
	}
}

export async function getAsset(key: string): Promise<UIAsset | null> {
	try {
		const record = await pb.collection(Collections.UiAssets).getFirstListItem(`key="${key}"`);

		let url = '';
		if (record.image) {
			url = getFileUrl(record.collectionId, record.id, record.image);
		}

		return {
			...record,
			id: record.id,
			key: record.key,
			group: record.group,
			url,
			altText: record.alt_text || '',
			description: record.description || ''
		};
	} catch (_e) {
		return null;
	}
}

export async function getAssetUrl(key: string, fallback: string = ''): Promise<string> {
	const asset = await getAsset(key);
	return asset?.url || fallback;
}

export async function getAssetsByGroup(group: UIAsset['group']): Promise<UIAsset[]> {
	try {
		const records = await pb
			.collection(Collections.UiAssets)
			.getFullList<UiAssetsResponse>({
				filter: `group="${group}"`
			});

		return records.map((r) => {
			const url = resolvePocketBaseImage(r, 'image', '');

			return {
				...r,
				id: r.id,
				key: r.key,
				group: r.group,
				url,
				altText: r.alt_text || '',
				description: r.description || ''
			};
		});
	} catch (_e) {
		return [];
	}
}
