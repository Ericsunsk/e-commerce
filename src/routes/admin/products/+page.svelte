<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	// Intentional snapshot: rows become client-owned state after optimistic toggles.
	let rows = $state(data.products.map((p) => ({ ...p })));
	let pendingIds = $state(new Set<string>());
	let error = $state('');

	async function toggleActive(id: string, next: boolean) {
		const previous = rows;
		rows = rows.map((row) => (row.id === id ? { ...row, isActive: next } : row));
		pendingIds = new Set(pendingIds).add(id);
		error = '';

		try {
			const res = await fetch(`/api/admin/products/${id}/toggle`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: next })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || `Toggle failed (${res.status})`);
			}
		} catch (e: unknown) {
			rows = previous;
			error = e instanceof Error ? e.message : 'Toggle failed';
		} finally {
			const next_pending = new Set(pendingIds);
			next_pending.delete(id);
			pendingIds = next_pending;
		}
	}
</script>

<svelte:head>
	<title>Products | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex items-center justify-between mb-8">
	<h1 class="text-2xl font-display uppercase tracking-widest">Products</h1>
	<a
		href="/admin/products/new"
		class="px-5 py-3 bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:opacity-90"
	>
		New Product
	</a>
</div>

{#if error}
	<p role="alert" class="text-xs uppercase tracking-widest text-red-400 mb-4">{error}</p>
{/if}

<div class="border border-white/10 overflow-x-auto">
	<table class="w-full text-left min-w-[720px]">
		<thead>
			<tr class="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
				<th class="px-4 py-3">Product</th>
				<th class="px-4 py-3">Price</th>
				<th class="px-4 py-3 text-right">Stock</th>
				<th class="px-4 py-3 text-right">Variants</th>
				<th class="px-4 py-3 text-right">Active</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.id)}
				<tr class="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
					<td class="px-4 py-3">
						<div class="flex items-center gap-3">
							{#if row.image}
								<img src={row.image} alt="" class="w-10 h-12 object-cover" loading="lazy" />
							{/if}
							<div>
								<a href="/admin/products/{row.id}" class="text-sm hover:underline">{row.title}</a>
								<p class="text-[10px] text-white/40 font-mono">{row.slug}</p>
							</div>
						</div>
					</td>
					<td class="px-4 py-3 text-sm">{row.price}</td>
					<td class="px-4 py-3 text-sm text-right {row.totalStock <= 5 ? 'text-amber-400' : ''}">
						{row.totalStock}
					</td>
					<td class="px-4 py-3 text-sm text-right">{row.variantCount}</td>
					<td class="px-4 py-3 text-right">
						<button
							role="switch"
							aria-checked={row.isActive}
							aria-label="Toggle {row.title}"
							disabled={pendingIds.has(row.id)}
							onclick={() => toggleActive(row.id, !row.isActive)}
							class="relative inline-flex w-11 h-6 items-center rounded-full transition-colors {row.isActive
								? 'bg-emerald-500'
								: 'bg-white/20'} disabled:opacity-50"
						>
							<span
								class="inline-block w-4 h-4 rounded-full bg-white transition-transform {row.isActive
									? 'translate-x-6'
									: 'translate-x-1'}"
							></span>
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
