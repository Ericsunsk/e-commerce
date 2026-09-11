/**
 * Category admin (server-only).
 */
import { withAdmin } from '$shared/infrastructure/server';
import { Collections, type CategoriesResponse, type TypedPocketBase } from '$shared/infrastructure';
import { normalizeCategory, toCategoryRow, type CategoryRow } from '../domain/category-admin';
import {
	getCategoryTier,
	sortCategoriesByHierarchy,
	calculateTierSortShifts
} from '../domain/category-hierarchy';

async function countProductsWithClient(pb: TypedPocketBase, categoryId: string): Promise<number> {
	try {
		const result = await pb.collection(Collections.Products).getList(1, 1, {
			filter: `category ?~ "${categoryId}"`,
			fields: 'id'
		});
		return result.totalItems;
	} catch {
		return 0;
	}
}

export async function listAdminCategories(): Promise<CategoryRow[]> {
	return withAdmin(async (pb) => {
		const records = (await pb
			.collection(Collections.Categories)
			.getFullList({ sort: 'sort_order' })) as CategoriesResponse[];
		const rows: CategoryRow[] = [];
		for (const record of records) {
			rows.push(
				toCategoryRow(
					{
						id: record.id,
						name: record.name,
						slug: record.slug,
						sort_order: record.sort_order,
						is_visible: record.is_visible
					},
					await countProductsWithClient(pb, record.id)
				)
			);
		}
		return sortCategoriesByHierarchy(rows);
	}, []);
}

export async function saveAdminCategory(
	id: string | null,
	input: unknown
): Promise<{ id: string }> {
	const data = normalizeCategory(input);
	return withAdmin(async (pb) => {
		const targetTier = getCategoryTier({ slug: data.slug, name: data.name });

		// Fetch all existing categories to check the same tier for sort collisions
		const allRecords = (await pb
			.collection(Collections.Categories)
			.getFullList()) as CategoriesResponse[];

		const sameTierItems = allRecords
			.filter((r) => getCategoryTier({ slug: r.slug, name: r.name }) === targetTier)
			.map((r) => ({
				id: r.id,
				sort_order: Number(r.sort_order) || 0
			}));

		const { targetSortOrder, shifts } = calculateTierSortShifts(
			sameTierItems,
			id,
			data.sort_order
		);

		// Execute cascade shifts for items that collide
		for (const shift of shifts) {
			await pb.collection(Collections.Categories).update(shift.id, {
				sort_order: shift.sort_order
			});
		}

		const payload = {
			name: data.name,
			slug: data.slug,
			description: data.description || undefined,
			sort_order: targetSortOrder,
			is_visible: data.is_visible
		};
		if (id) {
			const updated = await pb.collection(Collections.Categories).update(id, payload);
			return { id: updated.id };
		}
		const created = await pb.collection(Collections.Categories).create(payload);
		return { id: created.id };
	});
}

/** Delete refuses when products still reference the row. */
export async function deleteAdminCategory(id: string): Promise<void> {
	await withAdmin(async (pb) => {
		const products = await countProductsWithClient(pb, id);
		if (products > 0) {
			throw { status: 409, message: `仍有 ${products} 个商品使用该分类，无法删除` };
		}
		await pb.collection(Collections.Categories).delete(id);
	});
}
