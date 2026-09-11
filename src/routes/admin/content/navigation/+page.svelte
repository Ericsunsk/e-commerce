<script lang="ts">
	import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import {
		ADMIN_BUTTONS,
		ADMIN_PAGE,
		ADMIN_SEGMENTED,
		ADMIN_CARDS,
		ADMIN_FORMS
	} from '$shared/kernel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.items.map((i) => ({ ...i })));
	let editingId = $state<string | 'new' | null>(null);
	let form = $state({
		label: '',
		url: '/',
		location: 'header',
		parent: '',
		order: 0,
		is_visible: true
	});
	let saving = $state(false);
	let formError = $state('');
	let error = $state('');

	const groups = $derived.by(() => {
		const order = ['header', 'footer', 'mobile'];
		const titles: Record<string, string> = {
			header: '顶部导航 (Header)',
			footer: '底部导航 (Footer)',
			mobile: '移动端抽屉 (Mobile)'
		};
		return order.map((location) => ({
			location,
			title: titles[location],
			items: rows
				.filter((r) => (r.location || 'header') === location)
				.sort((a, b) => a.order - b.order)
		}));
	});

	function openNew(location: string = 'header') {
		const groupItems = rows.filter((r) => (r.location || 'header') === location);
		editingId = 'new';
		form = {
			label: '',
			url: '/',
			location,
			parent: '',
			order: groupItems.length + 1,
			is_visible: true
		};
		formError = '';
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
	}

	function cancelEdit() {
		editingId = null;
		formError = '';
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
			const isNew = editingId === 'new';
			const url = isNew ? '/api/admin/content/navigation' : `/api/admin/content/navigation/${editingId}`;
			const res = await fetch(url, {
				method: isNew ? 'POST' : 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...form, parent: form.parent.trim() || undefined })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			editingId = null;
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

{#snippet navItemForm()}
	<div class="p-5 bg-zinc-50/80 border-b border-zinc-100 space-y-4">
		{#if formError}
			<p role="alert" class="p-3 bg-rose-50 text-rose-600 rounded-lg border border-rose-200 text-xs">
				{formError}
			</p>
		{/if}

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div class="sm:col-span-2">
				<label for="nav-label-input" class={ADMIN_FORMS.label}>菜单名称 *</label>
				<input
					id="nav-label-input"
					bind:value={form.label}
					placeholder="例如：新品上市 / NEW ARRIVALS"
					class={ADMIN_FORMS.inputSm}
				/>
			</div>
			<div>
				<label for="nav-order-input" class={ADMIN_FORMS.label}>显示排序</label>
				<input
					id="nav-order-input"
					bind:value={form.order}
					type="number"
					min="0"
					class="{ADMIN_FORMS.inputSm} font-mono"
				/>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div class="sm:col-span-2">
				<label for="nav-url-input" class={ADMIN_FORMS.label}>跳转链接 *</label>
				<input
					id="nav-url-input"
					bind:value={form.url}
					placeholder="/category/new 或 https://…"
					class="{ADMIN_FORMS.inputSm} font-mono"
				/>
			</div>
			<div>
				<label for="nav-location-select" class={ADMIN_FORMS.label}>所处位置</label>
				<select
					id="nav-location-select"
					bind:value={form.location}
					class={ADMIN_FORMS.select}
				>
					<option value="header">顶部导航 (Header)</option>
					<option value="footer">底部导航 (Footer)</option>
					<option value="mobile">移动端 (Mobile)</option>
				</select>
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-4 pt-1">
			<label class="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={form.is_visible}
					class="w-4 h-4 rounded text-zinc-900 accent-zinc-900 border-zinc-300 focus:ring-0 cursor-pointer"
				/>
				<span>启用并前台可见</span>
			</label>

			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={cancelEdit}
					class={ADMIN_BUTTONS.secondarySm}
				>
					取消
				</button>
				<button
					type="button"
					onclick={save}
					disabled={saving || !form.label.trim() || !form.url.trim()}
					class={ADMIN_BUTTONS.primarySm}
				>
					{saving ? '保存中…' : '保存'}
				</button>
			</div>
		</div>
	</div>
{/snippet}

<div class="{ADMIN_PAGE.container} max-w-5xl">
	<!-- Top Subnav & External Links -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<nav class={ADMIN_SEGMENTED.wrapper} aria-label="内容管理">
			{#each [
				{ href: '/admin/content', label: '站点配置' },
				{ href: '/admin/content/sections', label: '页面排版' },
				{ href: '/admin/content/pages', label: '页面管理' },
				{ href: '/admin/content/navigation', label: '导航管理' }
			] as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.href === '/admin/content/navigation' ? 'page' : undefined}
					class={tab.href === '/admin/content/navigation'
						? ADMIN_SEGMENTED.itemActive
						: ADMIN_SEGMENTED.itemInactive}
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
				class={ADMIN_BUTTONS.secondarySm}
				title="在新窗口打开 PocketBase 官方数据管理后台"
			>
				<UiIcon icon={ExternalLink} size={14} />
				<span>PB 后台</span>
			</a>
		{/if}
	</div>

	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class={ADMIN_PAGE.title}>导航菜单管理</h1>
			<p class={ADMIN_PAGE.subtitle}>顶部 Header、底部 Footer 与移动端抽屉导航结构编排</p>
		</div>
		<button
			type="button"
			onclick={() => openNew('header')}
			class={ADMIN_BUTTONS.primary}
		>
			<UiIcon icon={Plus} size={14} />
			<span>新建菜单项</span>
		</button>
	</div>

	{#if error}
		<p role="alert" class="p-3 bg-rose-50 text-rose-600 rounded-card border border-rose-200 text-xs">
			{error}
		</p>
	{/if}

	<!-- Navigation Groups -->
	<div class="space-y-6">
		{#each groups as group (group.location)}
			<section class="{ADMIN_CARDS.base} p-0 overflow-hidden">
				<!-- Group Header -->
				<div class="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between gap-3 bg-zinc-50/50">
					<div class="flex items-center gap-2.5">
						<h2 class={ADMIN_CARDS.title}>{group.title}</h2>
						<span class="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/60">
							{group.items.length}
						</span>
					</div>
					<button
						type="button"
						onclick={() => openNew(group.location)}
						class={ADMIN_BUTTONS.secondarySm}
					>
						<UiIcon icon={Plus} size={13} />
						<span>添加链接</span>
					</button>
				</div>

				<!-- Inline Creator for this group -->
				{#if editingId === 'new' && form.location === group.location}
					{@render navItemForm()}
				{/if}

				{#if group.items.length === 0}
					<div class="p-8 text-center text-xs text-zinc-400">
						暂无菜单项，点击右上角「添加链接」创建
					</div>
				{:else}
					<ul class="divide-y divide-zinc-100">
						{#each group.items as item (item.id)}
							<li>
								{#if editingId === item.id}
									{@render navItemForm()}
								{:else}
									<div class="flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-zinc-50/50 transition-colors {item.isActive ? '' : 'opacity-60 bg-zinc-50/30'}">
										<div class="min-w-0 flex items-center gap-3">
											<span class="text-[11px] font-mono text-zinc-400 shrink-0 w-6">#{item.order}</span>
											<div class="min-w-0">
												<p class="text-xs font-semibold text-zinc-900 truncate">{item.label}</p>
												<p class="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">{item.url}</p>
											</div>
										</div>

										<div class="flex items-center gap-2 shrink-0">
											<!-- Visibility Switch -->
											<button
												type="button"
												role="switch"
												aria-checked={item.isActive}
												aria-label="切换{item.label}显隐"
												onclick={() => toggleVisible(item.id, !item.isActive)}
												class="relative inline-flex w-8 h-4.5 items-center rounded-full transition-colors {item.isActive
													? 'bg-emerald-500'
													: 'bg-zinc-300'}"
											>
												<span
													class="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform {item.isActive
														? 'translate-x-4'
														: 'translate-x-0.5'}"
												></span>
											</button>

											<div class="h-3 w-px bg-zinc-200"></div>

											<button
												type="button"
												onclick={() => openEdit(item.id)}
												aria-label="编辑{item.label}"
												class={ADMIN_BUTTONS.icon}
												title="编辑"
											>
												<UiIcon icon={Pencil} size={14} />
											</button>
											<button
												type="button"
												onclick={() => remove(item.id, item.label)}
												aria-label="删除{item.label}"
												class={ADMIN_BUTTONS.danger}
												title="删除"
											>
												<UiIcon icon={Trash2} size={14} />
											</button>
										</div>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
	</div>
</div>
