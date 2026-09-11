<script lang="ts">
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Search, Users } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { ADMIN_BUTTONS } from '$shared/kernel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let q = $state(data.q);

	function apply() {
		const params = new SvelteURLSearchParams();
		if (q.trim()) params.set('q', q.trim());
		goto(`?${params.toString()}`);
	}

	function gotoPage(page: number) {
		const params = new SvelteURLSearchParams();
		if (q.trim()) params.set('q', q.trim());
		params.set('page', String(page));
		goto(`?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>客户 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-4xl">
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">客户管理</h1>
		<p class="text-xs text-zinc-500 mt-1">只读视图，不提供任何写操作</p>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			apply();
		}}
		class="flex gap-3 bg-white p-4 rounded-xl border border-zinc-200"
	>
		<div class="relative flex-1">
			<UiIcon
				icon={Search}
				size={16}
				class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
			/>
			<input
				bind:value={q}
				type="search"
				placeholder="按邮箱搜索…"
				aria-label="搜索客户"
				class="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:bg-white focus:border-zinc-900"
			/>
		</div>
		<button
			type="submit"
			class={ADMIN_BUTTONS.primarySm}
		>
			搜索
		</button>
	</form>

	<div class="bg-white border border-zinc-200 rounded-card overflow-hidden">
		{#if data.rows.length === 0}
			<p class="p-8 text-sm text-zinc-400 text-center">没有匹配的客户</p>
		{:else}
			<ul class="divide-y divide-zinc-100">
				{#each data.rows as row (row.id)}
					<li>
						<a href="/admin/customers/{row.id}" class="flex items-center justify-between gap-4 p-5 hover:bg-zinc-50/70">
							<div class="flex items-center gap-3 min-w-0">
								<UiIcon icon={Users} size={18} class="text-zinc-400 shrink-0" />
								<div class="min-w-0">
									<p class="text-sm font-mono text-zinc-900 truncate">{row.emailMasked}</p>
									<p class="text-[11px] text-zinc-400 mt-0.5">
										{row.verified ? '已验证' : '未验证'} · {row.orderCount} 个订单
									</p>
								</div>
							</div>
							<span class="text-[11px] text-zinc-400 font-mono shrink-0">{row.id.slice(0, 8)}…</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if data.totalPages > 1}
			<div class="flex items-center justify-between px-5 py-4 border-t border-zinc-100">
				<p class="text-xs text-zinc-400">第 {data.page} / {data.totalPages} 页 · 共 {data.totalItems} 人</p>
				<div class="flex gap-2">
					<button
						disabled={data.page <= 1}
						onclick={() => gotoPage(data.page - 1)}
						class={ADMIN_BUTTONS.secondarySm}
					>
						上一页
					</button>
					<button
						disabled={data.page >= data.totalPages}
						onclick={() => gotoPage(data.page + 1)}
						class={ADMIN_BUTTONS.secondarySm}
					>
						下一页
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
