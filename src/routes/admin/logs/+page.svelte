<script lang="ts">
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { ScrollText } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { ADMIN_BUTTONS } from '$shared/kernel/design-tokens';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	// Intentional snapshot: filters become client-owned state after navigation.
	let level = $state(data.query.level);
	// svelte-ignore state_referenced_locally
	let query = $state(data.query.query);

	function apply() {
		const params = new SvelteURLSearchParams();
		if (level !== 'all') params.set('level', level);
		if (query.trim()) params.set('q', query.trim());
		goto(`?${params.toString()}`);
	}

	function gotoPage(page: number) {
		const params = new SvelteURLSearchParams();
		if (level !== 'all') params.set('level', level);
		if (query.trim()) params.set('q', query.trim());
		params.set('page', String(page));
		goto(`?${params.toString()}`);
	}

	function levelClass(level: string): string {
		switch (level) {
			case 'ERROR':
				return 'bg-rose-50 text-rose-700 border-rose-200';
			case 'WARN':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			case 'DEBUG':
				return 'bg-zinc-100 text-zinc-500 border-zinc-200';
			default:
				return 'bg-sky-50 text-sky-700 border-sky-200';
		}
	}
</script>

<svelte:head>
	<title>日志 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-5xl">
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">服务端日志</h1>
		<p class="text-xs text-zinc-500 mt-1">
			PocketBase 请求日志（仅保留 5 天）· 应用 errorId 请查服务端标准输出
		</p>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			apply();
		}}
		class="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs"
	>
		<select
			bind:value={level}
			aria-label="日志级别"
			class="bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
		>
			<option value="all">全部级别</option>
			<option value="DEBUG">DEBUG</option>
			<option value="INFO">INFO</option>
			<option value="WARN">WARN</option>
			<option value="ERROR">ERROR</option>
		</select>
		<input
			bind:value={query}
			type="search"
			placeholder="搜索 message / URL / errorId…"
			aria-label="搜索日志"
			class="flex-1 bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
		/>
		<button
			type="submit"
			class={ADMIN_BUTTONS.primary}
		>
			搜索
		</button>
	</form>

	<div class="bg-white border border-zinc-200 rounded-card shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left min-w-[760px]">
				<thead>
					<tr class="bg-zinc-50/80 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
						<th class="px-5 py-3.5">时间</th>
						<th class="px-5 py-3.5">级别</th>
						<th class="px-5 py-3.5">请求</th>
						<th class="px-5 py-3.5 text-right">状态</th>
						<th class="px-5 py-3.5 text-right">耗时</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each data.rows as row (row.id)}
						<tr class="hover:bg-zinc-50/70">
							<td class="px-5 py-3 text-xs font-mono text-zinc-500 whitespace-nowrap">
								{row.created}
							</td>
							<td class="px-5 py-3">
								<span
									class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border {levelClass(row.level)}"
								>
									{row.level}
								</span>
							</td>
							<td class="px-5 py-3 text-xs min-w-0">
								{#if row.method}
									<span class="font-mono font-bold text-zinc-700">{row.method}</span>
								{/if}
								<span class="font-mono text-zinc-500 break-all">{row.url}</span>
								{#if row.message}
									<p class="text-zinc-400 truncate max-w-md mt-0.5">{row.message}</p>
								{/if}
							</td>
							<td class="px-5 py-3 text-xs font-mono text-right">
								{row.status ?? '—'}
							</td>
							<td class="px-5 py-3 text-xs font-mono text-right text-zinc-500">
								{row.execMs != null ? `${row.execMs}ms` : '—'}
							</td>
						</tr>
					{/each}
					{#if data.rows.length === 0}
						<tr>
							<td colspan="5" class="px-5 py-12 text-center text-sm text-zinc-400">
								<UiIcon icon={ScrollText} size={30} class="text-zinc-300 block mb-2 mx-auto" />
								没有匹配的日志。
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		{#if data.totalPages > 1}
			<div class="flex items-center justify-between px-5 py-4 border-t border-zinc-100">
				<p class="text-xs text-zinc-400">
					第 {data.page} / {data.totalPages} 页 · 共 {data.totalItems} 条
				</p>
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
