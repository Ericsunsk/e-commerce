import { pb, getFileUrl, resolvePocketBaseImage, resolvePocketBaseGallery } from './pocketbase';
import type { Page, UISection, UIAsset, SectionType, UISectionSettings } from '$lib/types';
import { isValidSlug } from '$lib/constants';
import { Collections } from '$lib/pocketbase-types';

// =============================================================================
// Content Module - Pages, Sections & Assets
// =============================================================================

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
            ogImage: record.og_image ? getFileUrl(record.collectionId, record.id, record.og_image) : undefined,
            heroImage: record.hero_image ? getFileUrl(record.collectionId, record.id, record.hero_image) : undefined,
            content: record.content || ''
        };
    } catch (e) {
        return null;
    }
}

export async function getPageSections(pageSlug: string): Promise<UISection[]> {
    try {
        // First get the page
        const page = await pb.collection(Collections.Pages).getFirstListItem(`slug="${pageSlug}"`);

        // Then get sections for that page
        const records = await pb.collection(Collections.UiSections).getFullList({
            filter: `page="${page.id}" && is_active=true`,
            sort: 'sort_order'
        });

        return records.map(r => {
            const settings = (r.settings || {}) as UISectionSettings;

            // Build image URL: prioritize FILE field, fallback to external settings
            let imageUrl = resolvePocketBaseImage(r, 'image', '');
            if (!imageUrl && settings.external?.image_url) {
                imageUrl = settings.external.image_url;
            }

            // Build video URL: prioritize FILE field, fallback to external settings
            let videoUrl = resolvePocketBaseImage(r, 'video', '');
            if (!videoUrl && settings.external?.video_url) {
                videoUrl = settings.external.video_url;
            }

            return {
                ...r, // Spread system fields
                id: r.id,
                pageId: r.page,
                type: r.type as SectionType,
                heading: r.heading || '',
                subheading: r.subheading || '',
                content: r.content || '',
                imageUrl,
                videoUrl,
                imageGallery: resolvePocketBaseGallery(r, 'image'),
                videoGallery: resolvePocketBaseGallery(r, 'video'),
                settings,
                sortOrder: r.sort_order || 0,
                isActive: r.is_active ?? true
            };
        });
    } catch (e) {
        return [];
    }
}

export async function getAsset(key: string): Promise<UIAsset | null> {
    try {
        const record = await pb.collection(Collections.UiAssets).getFirstListItem(`key="${key}"`);

        // Prioritize FILE field, fallback to URL field
        // Only use IMAGE file field
        let url = '';
        if (record.image) {
            url = getFileUrl(record.collectionId, record.id, record.image);
        }

        return {
            ...record,
            id: record.id,
            key: record.key,
            group: record.group,
            // type removed
            url,
            altText: record.alt_text || '',
            description: record.description || ''
        };
    } catch (e) {
        return null;
    }
}

export async function getAssetUrl(key: string, fallback: string = ''): Promise<string> {
    const asset = await getAsset(key);
    return asset?.url || fallback;
}

export async function getAssetsByGroup(group: UIAsset['group']): Promise<UIAsset[]> {
    try {
        const records = await pb.collection(Collections.UiAssets).getFullList({
            filter: `group="${group}"`
        });

        return records.map(r => {
            // Only use IMAGE file field
            const url = resolvePocketBaseImage(r, 'image', '');

            return {
                ...r,
                id: r.id,
                key: r.key,
                group: r.group,
                // type removed
                url,
                altText: r.alt_text || '',
                description: r.description || ''
            };
        });
    } catch (e) {
        return [];
    }
}

export async function getCollectionImages() {
    try {
        const { initAdmin } = await import('$lib/server/pocketbase');
        await initAdmin();

        const records = await pb.collection(Collections.CollectionImages).getFullList();
        return records.map(r => ({
            id: r.id,
            collectionId: r.collectionId,
            title: r.title,
            image: r.image,
            position: r.position,
            link: r.link,
            active: r.active
        })).filter(r => r.active);
    } catch (e: any) {
        console.warn("Failed to fetch collection images:", e.message);
        return [];
    }
}
