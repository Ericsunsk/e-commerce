<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { CircleAlert, Image as ImageIcon, Plus, Search, SearchX } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.products.map((p) => ({ ...p })));
	let pendingIds = new SvelteSet<string>();
	let error = $state('');
	let search = $state('');

	let visibleRows = $derived(
		rows.filter((row) => {
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return row.title.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q);
		})
	);

	async function toggleActive(id: string, next: boolean) {
		const previous = rows;
		rows = rows.map((row) => (row.id === id ? { ...row, isActive: next } : row));
		pendingIds.add(id);
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
			error = e instanceof Error ? e.message : '切换失败';
		} finally {
			pendingIds.delete(id);
		}
	}
</script>

<svelte:head>
	<title>商品 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6">
	<!-- Top Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
				商品目录
			</h1>
			<p class="text-xs text-zinc-500 mt-1">管理店铺商品、价格、规格与上架状态</p>
		</div>
		<div class="flex items-center gap-3">
			<a
				href="/admin/products/new"
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 shadow-xs transition-colors"
			>
				<UiIcon icon={Plus} size={16} />
				新建商品
			</a>
		</div>
	</div>

	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<UiIcon icon={CircleAlert} size={16} class="shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Search & Filters -->
	<div
		class="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs"
	>
		<div class="relative flex-1 max-w-md">
			<UiIcon
				icon={Search}
				size={18}
				class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
			/>
			<input
				type="search"
				placeholder="搜索商品标题或 slug..."
				bind:value={search}
				aria-label="搜索商品"
				class="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-900 transition-all"
			/>
		</div>
		<span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
			{visibleRows.length} 件商品
		</span>
	</div>

	<!-- Table Card -->
	<div class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left min-w-[760px]">
				<thead>
					<tr
						class="bg-zinc-50/80 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500"
					>
						<th class="px-5 py-3.5">商品</th>
						<th class="px-5 py-3.5">价格</th>
						<th class="px-5 py-3.5 text-right">总库存</th>
						<th class="px-5 py-3.5 text-right">规格数</th>
						<th class="px-5 py-3.5 text-right">店铺上架</th>
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
										<div
											class="w-10 h-12 rounded-md border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0"
										>
											<UiIcon icon={ImageIcon} size={16} />
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
									class="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border {row.totalStock <=
									5
										? 'bg-amber-50 text-amber-700 border-amber-200'
										: 'bg-zinc-50 text-zinc-700 border-zinc-200'}"
								>
									{row.totalStock}
								</span>
							</td>
							<td class="px-5 py-3.5 text-sm text-right font-medium text-zinc-600">
								{row.variantCount} 个规格
							</td>
							<td class="px-5 py-3.5 text-right">
								<button
									role="switch"
									aria-checked={row.isActive}
									aria-label="切换{row.title}上架状态"
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
								<UiIcon icon={SearchX} size={30} class="text-zinc-300 block mb-2 mx-auto" />
								没有符合搜索条件的商品。
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
