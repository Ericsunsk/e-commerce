<script lang="ts">
	import { DatabaseBackup, Download, RefreshCw } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.backups.map((b) => ({ ...b })));
	let creating = $state(false);
	let error = $state('');

	async function refresh() {
		try {
			const res = await fetch('/api/admin/backups/list');
			if (!res.ok) return;
			const body = await res.json();
			rows = body.backups ?? rows;
		} catch {
			// Silent: list already rendered server-side.
		}
	}

	async function triggerBackup() {
		creating = true;
		error = '';
		try {
			const res = await fetch('/api/admin/backups', { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '创建备份失败');
			await refresh();
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '创建备份失败';
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>备份 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-3xl">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">备份管理</h1>
			<p class="text-xs text-zinc-500 mt-1">自动日备运行中，手动备份即时创建</p>
		</div>
		<button
			type="button"
			onclick={triggerBackup}
			disabled={creating}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 disabled:opacity-50"
		>
			<UiIcon icon={RefreshCw} size={14} class={creating ? 'animate-spin' : ''} />
			{creating ? '备份中…' : '手动备份'}
		</button>
	</div>

	{#if error}
		<p role="alert" class="text-xs text-rose-600">{error}</p>
	{/if}

	<div class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
		{#if rows.length === 0}
			<p class="p-8 text-sm text-zinc-400 text-center">暂无备份文件</p>
		{:else}
			<ul class="divide-y divide-zinc-100">
				{#each rows as row (row.key)}
					<li class="flex items-center justify-between gap-4 p-5">
						<div class="flex items-center gap-3 min-w-0">
							<UiIcon icon={DatabaseBackup} size={18} class="text-zinc-400 shrink-0" />
							<div class="min-w-0">
								<p class="text-sm font-mono text-zinc-900 truncate">{row.key}</p>
								<p class="text-[11px] text-zinc-400 mt-0.5">
									{row.sizeFormatted} · {row.modified}{row.auto ? ' · 自动' : ''}
								</p>
							</div>
						</div>
						<a
							href="/api/admin/backups/download?key={encodeURIComponent(row.key)}"
							class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 text-zinc-600 text-[11px] font-semibold uppercase tracking-wider hover:bg-zinc-50 shrink-0"
						>
							<UiIcon icon={Download} size={14} />
							下载
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
