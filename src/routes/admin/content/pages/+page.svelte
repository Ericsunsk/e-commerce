<script lang="ts">
	import { Plus, Pencil, Trash2, X, ExternalLink } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { ADMIN_BUTTONS } from '$shared/kernel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.pages.map((p) => ({ ...p })));
	let drawerOpen = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state({ slug: '', title: '', content: '', meta_description: '' });
	let saving = $state(false);
	let formError = $state('');
	let error = $state('');

	function openNew() {
		editingId = null;
		form = { slug: '', title: '', content: '', meta_description: '' };
		formError = '';
		drawerOpen = true;
	}

	async function openEdit(id: string) {
		formError = '';
		try {
			const res = await fetch(`/api/admin/content/pages/${id}`);
			if (!res.ok) throw new Error('加载失败');
			const body = await res.json();
			const page = body.page;
			editingId = id;
			form = {
				slug: page.slug ?? '',
				title: page.title ?? '',
				content: page.content ?? '',
				meta_description: page.meta_description ?? ''
			};
			drawerOpen = true;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '加载失败';
		}
	}

	async function save() {
		saving = true;
		formError = '';
		try {
			const url = editingId ? `/api/admin/content/pages/${editingId}` : '/api/admin/content/pages';
			const res = await fetch(url, {
				method: editingId ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			drawerOpen = false;
			const list = await fetch('/api/admin/content/pages').catch(() => null);
			if (list?.ok) {
				rows = (await list.json()).pages;
			}
		} catch (e: unknown) {
			formError = e instanceof Error ? e.message : '保存失败';
		} finally {
			saving = false;
		}
	}

	async function remove(id: string, slug: string) {
		if (!confirm(`确定删除页面 /${slug} 吗？`)) return;
		error = '';
		try {
			const res = await fetch(`/api/admin/content/pages/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('删除失败');
			rows = rows.filter((r) => r.id !== id);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '删除失败';
		}
	}
</script>

<svelte:head>
	<title>页面管理 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-4xl">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<nav class="flex flex-wrap gap-2" aria-label="内容管理">
			{#each [{ href: '/admin/content', label: '站点配置' }, { href: '/admin/content/pages', label: '页面管理' }, { href: '/admin/content/sections', label: '页面排版' }, { href: '/admin/content/navigation', label: '导航管理' }] as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.href === '/admin/content/pages' ? 'page' : undefined}
					class="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border {tab.href === '/admin/content/pages'
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
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">页面管理</h1>
			<p class="text-xs text-zinc-500 mt-1">前台内容页的标题与正文（HTML）</p>
		</div>
		<button
			type="button"
			onclick={openNew}
			class={ADMIN_BUTTONS.primary}
		>
			<UiIcon icon={Plus} size={14} />
			新建页面
		</button>
	</div>

	{#if error}
		<p role="alert" class="text-xs text-rose-600">{error}</p>
	{/if}

	<div class="bg-white border border-zinc-200 rounded-card overflow-hidden">
		{#if rows.length === 0}
			<p class="p-8 text-sm text-zinc-400 text-center">暂无页面</p>
		{:else}
			<ul class="divide-y divide-zinc-100">
				{#each rows as row (row.id)}
					<li class="flex items-center justify-between gap-4 p-5">
						<div class="min-w-0">
							<p class="text-sm font-semibold text-zinc-900 truncate">{row.title || '(无标题)'}</p>
							<p class="text-xs text-zinc-400 font-mono mt-0.5">/{row.slug}</p>
						</div>
						<div class="flex items-center gap-2 shrink-0">
							<button
								type="button"
								onclick={() => openEdit(row.id)}
								aria-label="编辑{row.slug}"
								class={ADMIN_BUTTONS.icon}
							>
								<UiIcon icon={Pencil} size={14} />
							</button>
							<button
								type="button"
								onclick={() => remove(row.id, row.slug)}
								aria-label="删除{row.slug}"
								class={ADMIN_BUTTONS.danger}
							>
								<UiIcon icon={Trash2} size={14} />
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

{#if drawerOpen}
	<div class="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="编辑页面">
		<button aria-label="关闭" class="absolute inset-0 bg-zinc-900/40 cursor-default" onclick={() => (drawerOpen = false)}></button>
		<aside class="absolute right-0 top-0 h-full w-full max-w-xl bg-white border-l border-zinc-200 shadow-2xl p-6 sm:p-8 overflow-y-auto">
			<div class="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
				<h2 class="text-xl font-display font-bold uppercase tracking-wider text-zinc-900">
					{editingId ? '编辑页面' : '新建页面'}
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
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">Slug *</span>
						<input
							bind:value={form.slug}
							placeholder="about-us"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</label>
					<label class="block">
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">标题 *</span>
						<input
							bind:value={form.title}
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</label>
				</div>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">正文 HTML</span>
					<textarea
						bind:value={form.content}
						rows="12"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
					></textarea>
				</label>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">SEO 描述</span>
					<input
						bind:value={form.meta_description}
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
					/>
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
					disabled={saving || !form.slug.trim() || !form.title.trim()}
					class="flex-1 {ADMIN_BUTTONS.primary}"
				>
					{saving ? '保存中…' : '保存'}
				</button>
			</div>
		</aside>
	</div>
{/if}
