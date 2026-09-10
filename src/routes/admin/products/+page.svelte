<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.products.map((p) => ({ ...p })));
	let pendingIds = $state(new Set<string>());
	let error = $state('');
	let search = $state('');

	let visibleRows = $derived(
		rows.filter((row) => {
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return (
				row.title.toLowerCase().includes(q) ||
				row.slug.toLowerCase().includes(q)
			);
		})
	);

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
			const nextPending = new Set(pendingIds);
			nextPending.delete(id);
			pendingIds = nextPending;
		}
	}
</script>

<svelte:head>
	<title>Products | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6">
	<!-- Top Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">Products Catalog</h1>
			<p class="text-xs text-zinc-500 mt-1">Manage storefront inventory, prices, variants, and visibility</p>
		</div>
		<div class="flex items-center gap-3">
			<a
				href="/admin/products/new"
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 shadow-xs transition-colors"
			>
				<span class="material-symbols-outlined text-base">add</span>
				New Product
			</a>
		</div>
	</div>

	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<span class="material-symbols-outlined text-base shrink-0">error</span>
			<span>{error}</span>
		</div>
	{/if}

	<!-- Search & Filters -->
	<div class="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">
				search
			</span>
			<input
				type="search"
				placeholder="Search product title or slug..."
				bind:value={search}
				aria-label="Search products"
				class="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-900 transition-all"
			/>
		</div>
		<span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
			{visibleRows.length} {visibleRows.length === 1 ? 'Product' : 'Products'}
		</span>
	</div>

	<!-- Table Card -->
	<div class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left min-w-[760px]">
				<thead>
					<tr class="bg-zinc-50/80 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
						<th class="px-5 py-3.5">Product</th>
						<th class="px-5 py-3.5">Price</th>
						<th class="px-5 py-3.5 text-right">Total Stock</th>
						<th class="px-5 py-3.5 text-right">Variants</th>
						<th class="px-5 py-3.5 text-right">Storefront Active</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each visibleRows as row (row.id)}
						<tr class="hover:bg-zinc-50/70 transition-colors">
							<td class="px-5 py-3.5">
								<div class="flex items-center gap-3.5">
									{#if row.image}
										<img
											src={row.image}
											alt=""
											class="w-10 h-12 object-cover rounded-md border border-zinc-200 shrink-0 bg-zinc-100"
											loading="lazy"
										/>
									{:else}
										<div class="w-10 h-12 rounded-md border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
											<span class="material-symbols-outlined text-base">image</span>
										</div>
									{/if}
									<div class="min-w-0">
										<a
											href="/admin/products/{row.id}"
											class="text-sm font-semibold text-zinc-900 hover:text-zinc-600 block truncate"
										>
											{row.title}
										</a>
										<p class="text-xs text-zinc-400 font-mono mt-0.5 truncate">
											/{row.slug}
										</p>
									</div>
								</div>
							</td>
							<td class="px-5 py-3.5 text-sm font-bold text-zinc-900">{row.price}</td>
							<td class="px-5 py-3.5 text-sm text-right">
								<span
									class="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border {row.totalStock <= 5
										? 'bg-amber-50 text-amber-700 border-amber-200'
										: 'bg-zinc-50 text-zinc-700 border-zinc-200'}"
								>
									{row.totalStock}
								</span>
							</td>
							<td class="px-5 py-3.5 text-sm text-right font-medium text-zinc-600">
								{row.variantCount} {row.variantCount === 1 ? 'variant' : 'variants'}
							</td>
							<td class="px-5 py-3.5 text-right">
								<button
									role="switch"
									aria-checked={row.isActive}
									aria-label="Toggle {row.title} visibility"
									disabled={pendingIds.has(row.id)}
									onclick={() => toggleActive(row.id, !row.isActive)}
									class="relative inline-flex w-11 h-6 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed {row.isActive
										? 'bg-emerald-500'
										: 'bg-zinc-300'} disabled:opacity-50 shadow-inner"
								>
									<span
										class="inline-block w-4 h-4 rounded-full bg-white transition-transform shadow-xs {row.isActive
											? 'translate-x-6'
											: 'translate-x-1'}"
									></span>
								</button>
							</td>
						</tr>
					{/each}
					{#if visibleRows.length === 0}
						<tr>
							<td colspan="5" class="px-5 py-12 text-center text-sm text-zinc-400">
								<span class="material-symbols-outlined text-3xl text-zinc-300 block mb-2">search_off</span>
								No products matched your search.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
