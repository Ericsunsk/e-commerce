/**
 * Category admin (server-only).
 */
import { withAdmin } from '$shared/infrastructure/server';
import { Collections, type CategoriesResponse, type TypedPocketBase } from '$shared/infrastructure';
import { normalizeCategory, toCategoryRow, type CategoryRow } from '../domain/category-admin';

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
		return rows;
	}, []);
}

export async function saveAdminCategory(
	id: string | null,
	input: unknown
): Promise<{ id: string }> {
	const data = normalizeCategory(input);
	return withAdmin(async (pb) => {
		const payload = {
			name: data.name,
			slug: data.slug,
			description: data.description || undefined,
			sort_order: data.sort_order,
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
