<script lang="ts">
	import { Plus, Pencil, Trash2, X, Eye, EyeOff, ExternalLink } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { ADMIN_BUTTONS } from '$shared/kernel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.items.map((i) => ({ ...i })));
	let drawerOpen = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state({ label: '', url: '/', location: 'header', parent: '', order: 0, is_visible: true });
	let saving = $state(false);
	let formError = $state('');
	let error = $state('');

	const groups = $derived.by(() => {
		const order = ['header', 'footer', 'mobile'];
		const titles: Record<string, string> = { header: '顶部导航', footer: '底部导航', mobile: '移动端' };
		return order.map((location) => ({
			location,
			title: titles[location],
			items: rows
				.filter((r) => (r.location || 'header') === location)
				.sort((a, b) => a.order - b.order)
		}));
	});

	function openNew() {
		editingId = null;
		form = { label: '', url: '/', location: 'header', parent: '', order: 0, is_visible: true };
		formError = '';
		drawerOpen = true;
	}

	function openEdit(id: string) {
		const row = rows.find((r) => r.id === id);
		if (!row) return;
		editingId = id;
		form = {
			label: row.label,
			url: row.url,
			location: row.location || 'header',
			parent: row.parent || '',
			order: row.order,
			is_visible: row.isActive
		};
		formError = '';
		drawerOpen = true;
	}

	async function refresh() {
		try {
			const res = await fetch('/api/admin/content/navigation');
			if (res.ok) rows = (await res.json()).items;
		} catch {
			// Silent: keep client state.
		}
	}

	async function save() {
		saving = true;
		formError = '';
		try {
			const url = editingId ? `/api/admin/content/navigation/${editingId}` : '/api/admin/content/navigation';
			const res = await fetch(url, {
				method: editingId ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...form, parent: form.parent.trim() || undefined })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			drawerOpen = false;
			await refresh();
		} catch (e: unknown) {
			formError = e instanceof Error ? e.message : '保存失败';
		} finally {
			saving = false;
		}
	}

	async function toggleVisible(id: string, next: boolean) {
		const row = rows.find((r) => r.id === id);
		if (!row) return;
		const previous = rows;
		rows = rows.map((r) => (r.id === id ? { ...r, isActive: next } : r));
		try {
			const res = await fetch(`/api/admin/content/navigation/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					label: row.label,
					url: row.url,
					location: row.location,
					parent: row.parent || undefined,
					order: row.order,
					is_visible: next
				})
			});
			if (!res.ok) throw new Error('切换失败');
			await refresh();
		} catch {
			rows = previous;
		}
	}

	async function remove(id: string, label: string) {
		if (!confirm(`确定删除导航「${label}」吗？`)) return;
		error = '';
		try {
			const res = await fetch(`/api/admin/content/navigation/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('删除失败');
			rows = rows.filter((r) => r.id !== id);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '删除失败';
		}
	}
</script>

<svelte:head>
	<title>导航管理 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-4xl">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<nav class="flex flex-wrap gap-2" aria-label="内容管理">
			{#each [{ href: '/admin/content', label: '站点配置' }, { href: '/admin/content/pages', label: '页面管理' }, { href: '/admin/content/sections', label: '页面排版' }, { href: '/admin/content/navigation', label: '导航管理' }] as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.href === '/admin/content/navigation' ? 'page' : undefined}
					class="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border {tab.href === '/admin/content/navigation'
						? 'bg-zinc-900 text-white border-zinc-900'
						: 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}"
				>
					{tab.label}
				</a>
			{/each}
		</nav>

		{#if data.pocketbaseUrl}
			<a
				href={`${data.pocketbaseUrl}/_/`}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-xs transition-colors shrink-0"
				title="在新窗口打开 PocketBase 官方数据管理后台"
			>
				<UiIcon icon={ExternalLink} size={14} />
				<span>PB 数据后台</span>
			</a>
		{/if}
	</div>
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">导航管理</h1>
			<p class="text-xs text-zinc-500 mt-1">顶部 / 底部 / 移动端菜单项</p>
		</div>
		<button
			type="button"
			onclick={openNew}
			class={ADMIN_BUTTONS.primary}
		>
			<UiIcon icon={Plus} size={14} />
			新建菜单项
		</button>
	</div>

	{#if error}
		<p role="alert" class="text-xs text-rose-600">{error}</p>
	{/if}

	{#each groups as group (group.location)}
		<section class="bg-white border border-zinc-200 rounded-card overflow-hidden">
			<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800 p-5 border-b border-zinc-100">
				{group.title}（{group.items.length}）
			</h2>
			{#if group.items.length === 0}
				<p class="p-5 text-sm text-zinc-400">暂无菜单项</p>
			{:else}
				<ul class="divide-y divide-zinc-100">
					{#each group.items as item (item.id)}
						<li class="flex items-center justify-between gap-4 p-5">
							<div class="min-w-0">
								<p class="text-sm font-semibold text-zinc-900 truncate">{item.label}</p>
								<p class="text-xs text-zinc-400 font-mono mt-0.5 truncate">{item.url}</p>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<button
									type="button"
									onclick={() => toggleVisible(item.id, !item.isActive)}
									aria-label="切换{item.label}显隐"
									class={ADMIN_BUTTONS.icon}
								>
									<UiIcon icon={item.isActive ? Eye : EyeOff} size={14} />
								</button>
								<button
									type="button"
									onclick={() => openEdit(item.id)}
									aria-label="编辑{item.label}"
									class={ADMIN_BUTTONS.icon}
								>
									<UiIcon icon={Pencil} size={14} />
								</button>
								<button
									type="button"
									onclick={() => remove(item.id, item.label)}
									aria-label="删除{item.label}"
									class={ADMIN_BUTTONS.danger}
								>
									<UiIcon icon={Trash2} size={14} />
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
</div>

{#if drawerOpen}
	<div class="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="编辑菜单项">
		<button aria-label="关闭" class="absolute inset-0 bg-zinc-900/40 cursor-default" onclick={() => (drawerOpen = false)}></button>
		<aside class="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-zinc-200 shadow-2xl p-6 sm:p-8 overflow-y-auto">
			<div class="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
				<h2 class="text-xl font-display font-bold uppercase tracking-wider text-zinc-900">
					{editingId ? '编辑菜单项' : '新建菜单项'}
				</h2>
				<button
					onclick={() => (drawerOpen = false)}
					class={ADMIN_BUTTONS.icon}
					aria-label="关闭"
				>
					<UiIcon icon={X} size={20} />
				</button>
			</div>

			{#if formError}
				<p role="alert" class="text-xs text-rose-600 mb-4">{formError}</p>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<label class="block">
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">名称 *</span>
						<input
							bind:value={form.label}
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</label>
					<label class="block">
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">排序</span>
						<input
							bind:value={form.order}
							type="number"
							min="0"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</label>
				</div>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">链接 *</span>
					<input
						bind:value={form.url}
						placeholder="/shop 或 https://…"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
					/>
				</label>
				<div class="grid grid-cols-2 gap-4">
					<label class="block">
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">位置</span>
						<select
							bind:value={form.location}
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
						>
							<option value="header">顶部导航</option>
							<option value="footer">底部导航</option>
							<option value="mobile">移动端</option>
						</select>
					</label>
					<label class="block">
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">父级 ID（选填）</span>
						<input
							bind:value={form.parent}
							placeholder="留空为顶级"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</label>
				</div>
				<label class="flex items-center gap-2 text-xs font-semibold text-zinc-700">
					<input type="checkbox" bind:checked={form.is_visible} class="w-4 h-4 accent-emerald-600" />
					前台可见
				</label>
			</div>

			<div class="flex gap-3 mt-6">
				<button
					type="button"
					onclick={() => (drawerOpen = false)}
					class="flex-1 {ADMIN_BUTTONS.secondary}"
				>
					取消
				</button>
				<button
					type="button"
					onclick={save}
					disabled={saving || !form.label.trim() || !form.url.trim()}
					class="flex-1 {ADMIN_BUTTONS.primary}"
				>
					{saving ? '保存中…' : '保存'}
				</button>
			</div>
		</aside>
	</div>
{/if}
