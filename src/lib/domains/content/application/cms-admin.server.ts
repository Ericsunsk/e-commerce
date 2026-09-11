/**
 * CMS pages + navigation admin (server-only).
 */
import { withAdmin } from '$shared/infrastructure/server';
import {
	Collections,
	type PagesResponse,
	type NavigationResponse,
	type UiSectionsResponse
} from '$shared/infrastructure';
import {
	normalizePageInput,
	normalizeNavInput,
	normalizeSectionInput,
	toPageRow,
	toNavRow,
	toSectionRow,
	type PageRow,
	type NavRow,
	type SectionRow
} from '../domain/cms-admin';

export async function listAdminPages(): Promise<PageRow[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.Pages).getFullList({ sort: 'slug' });
		return (records as Array<PagesResponse & { updated?: string }>).map((r) =>
			toPageRow({ id: r.id, slug: r.slug, title: r.title, updated: String(r.updated ?? '') })
		);
	}, []);
}

export async function getAdminPageById(
	id: string
): Promise<(PagesResponse & { content?: string; meta_description?: string }) | null> {
	return withAdmin(async (pb) => {
		try {
			return await pb.collection(Collections.Pages).getOne(id);
		} catch {
			return null;
		}
	}, null);
}

export async function saveAdminPage(id: string | null, input: unknown): Promise<{ id: string }> {
	const data = normalizePageInput(input);
	return withAdmin(async (pb) => {
		if (id) {
			const updated = await pb.collection(Collections.Pages).update(id, data);
			return { id: updated.id };
		}
		const created = await pb.collection(Collections.Pages).create(data);
		return { id: created.id };
	});
}

export async function deleteAdminPage(id: string): Promise<void> {
	await withAdmin((pb) => pb.collection(Collections.Pages).delete(id));
}

export async function listAdminNav(location?: string): Promise<NavRow[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.Navigation).getFullList({
			sort: 'order',
			...(location ? { filter: `location = "${location}"` } : {})
		});
		return (records as NavigationResponse[]).map((r) =>
			toNavRow({
				id: r.id,
				label: r.label,
				url: r.url,
				location: r.location,
				parent: r.parent,
				order: r.order,
				is_visible: r.is_visible
			})
		);
	}, []);
}

export async function getAdminNavItemById(id: string): Promise<NavigationResponse | null> {
	return withAdmin(async (pb) => {
		try {
			return await pb.collection(Collections.Navigation).getOne(id);
		} catch {
			return null;
		}
	}, null);
}

export async function saveAdminNavItem(id: string | null, input: unknown): Promise<{ id: string }> {
	const data = normalizeNavInput(input);
	const payload = {
		label: data.label,
		url: data.url,
		location: data.location,
		parent: data.parent || undefined,
		order: data.order,
		is_visible: data.is_visible
	};
	return withAdmin(async (pb) => {
		if (id) {
			const updated = await pb.collection(Collections.Navigation).update(id, payload);
			return { id: updated.id };
		}
		const created = await pb.collection(Collections.Navigation).create(payload);
		return { id: created.id };
	});
}

export async function deleteAdminNavItem(id: string): Promise<void> {
	await withAdmin((pb) => pb.collection(Collections.Navigation).delete(id));
}

export async function listAdminSections(pageId?: string): Promise<SectionRow[]> {
	return withAdmin(async (pb) => {
		const records = await pb.collection(Collections.UiSections).getFullList({
			sort: 'sort_order',
			...(pageId ? { filter: `page = "${pageId}"` } : {})
		});
		return (records as Array<UiSectionsResponse & { updated?: string }>).map((r) =>
			toSectionRow({
				id: r.id,
				page: r.page,
				type: r.type,
				heading: r.heading,
				subheading: r.subheading,
				sort_order: r.sort_order,
				is_active: r.is_active,
				image: r.image,
				updated: String(r.updated ?? '')
			})
		);
	}, []);
}

export async function getAdminSectionById(id: string): Promise<UiSectionsResponse | null> {
	return withAdmin(async (pb) => {
		try {
			return await pb.collection(Collections.UiSections).getOne(id);
		} catch {
			return null;
		}
	}, null);
}

export async function saveAdminSection(id: string | null, input: unknown): Promise<{ id: string }> {
	const data = normalizeSectionInput(input);
	return withAdmin(async (pb) => {
		if (id) {
			const updated = await pb.collection(Collections.UiSections).update(id, data);
			return { id: updated.id };
		}
		const created = await pb.collection(Collections.UiSections).create(data);
		return { id: created.id };
	});
}

export async function patchAdminSection(
	id: string,
	patch: { is_active?: boolean; sort_order?: number }
): Promise<{ id: string }> {
	return withAdmin(async (pb) => {
		const payload: Record<string, unknown> = {};
		if (patch.is_active !== undefined) payload.is_active = Boolean(patch.is_active);
		if (patch.sort_order !== undefined) payload.sort_order = Number(patch.sort_order);
		const updated = await pb.collection(Collections.UiSections).update(id, payload);
		return { id: updated.id };
	});
}

export async function deleteAdminSection(id: string): Promise<void> {
	await withAdmin((pb) => pb.collection(Collections.UiSections).delete(id));
}
