<script lang="ts">
	import { Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.categories.map((c) => ({ ...c })));
	let drawerOpen = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state({ name: '', slug: '', description: '', sort_order: 0, is_visible: true });
	let saving = $state(false);
	let formError = $state('');
	let error = $state('');

	function openNew() {
		editingId = null;
		form = { name: '', slug: '', description: '', sort_order: 0, is_visible: true };
		formError = '';
		drawerOpen = true;
	}

	function openEdit(id: string) {
		const row = rows.find((r) => r.id === id);
		if (!row) return;
		editingId = id;
		form = {
			name: row.name,
			slug: row.slug,
			description: '',
			sort_order: row.sortOrder,
			is_visible: row.isActive
		};
		formError = '';
		drawerOpen = true;
	}

	async function refresh() {
		try {
			const res = await fetch('/api/admin/categories');
			if (res.ok) rows = (await res.json()).categories;
		} catch {
			// Silent: keep client state.
		}
	}

	async function save() {
		saving = true;
		formError = '';
		try {
			const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories';
			const res = await fetch(url, {
				method: editingId ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
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
			const res = await fetch(`/api/admin/categories/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: row.name, slug: row.slug, is_visible: next })
			});
			if (!res.ok) throw new Error('切换失败');
			await refresh();
		} catch {
			rows = previous;
		}
	}

	async function remove(id: string, name: string, productCount: number) {
		if (productCount > 0) {
			error = `「${name}」仍有 ${productCount} 个商品，无法删除`;
			return;
		}
		if (!confirm(`确定删除分类「${name}」吗？`)) return;
		error = '';
		try {
			const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '删除失败');
			rows = rows.filter((r) => r.id !== id);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '删除失败';
		}
	}
</script>

<svelte:head>
	<title>分类管理 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-4xl">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">分类管理</h1>
			<p class="text-xs text-zinc-500 mt-1">
				<a href="/admin/products" class="hover:underline">← 返回商品</a>
			</p>
		</div>
		<button
			type="button"
			onclick={openNew}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800"
		>
			<UiIcon icon={Plus} size={14} />
			新建分类
		</button>
	</div>

	{#if error}
		<p role="alert" class="text-xs text-rose-600">{error}</p>
	{/if}

	<div class="bg-white border border-zinc-200 rounded-card shadow-xs overflow-hidden">
		{#if rows.length === 0}
			<p class="p-8 text-sm text-zinc-400 text-center">暂无分类</p>
		{:else}
			<ul class="divide-y divide-zinc-100">
				{#each rows.sort((a, b) => a.sortOrder - b.sortOrder) as row (row.id)}
					<li class="flex items-center justify-between gap-4 p-5">
						<div class="min-w-0">
							<p class="text-sm font-semibold text-zinc-900 truncate">{row.name}</p>
							<p class="text-xs text-zinc-400 font-mono mt-0.5">
								/{row.slug} · {row.productCount} 个商品
							</p>
						</div>
						<div class="flex items-center gap-2 shrink-0">
							<button
								type="button"
								onclick={() => toggleVisible(row.id, !row.isActive)}
								aria-label="切换{row.name}显隐"
								class="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
							>
								<UiIcon icon={row.isActive ? Eye : EyeOff} size={14} />
							</button>
							<button
								type="button"
								onclick={() => openEdit(row.id)}
								aria-label="编辑{row.name}"
								class="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
							>
								<UiIcon icon={Pencil} size={14} />
							</button>
							<button
								type="button"
								onclick={() => remove(row.id, row.name, row.productCount)}
								aria-label="删除{row.name}"
								class="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
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
	<div class="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="编辑分类">
		<button aria-label="关闭" class="absolute inset-0 bg-zinc-900/40 cursor-default" onclick={() => (drawerOpen = false)}></button>
		<aside class="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-zinc-200 shadow-2xl p-6 sm:p-8 overflow-y-auto">
			<div class="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
				<h2 class="text-xl font-display font-bold uppercase tracking-wider text-zinc-900">
					{editingId ? '编辑分类' : '新建分类'}
				</h2>
				<button
					onclick={() => (drawerOpen = false)}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
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
							bind:value={form.name}
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</label>
					<label class="block">
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">排序</span>
						<input
							bind:value={form.sort_order}
							type="number"
							min="0"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</label>
				</div>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">Slug（留空自动生成）</span>
					<input
						bind:value={form.slug}
						placeholder="mens"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
					/>
				</label>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">描述</span>
					<textarea
						bind:value={form.description}
						rows="3"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
					></textarea>
				</label>
				<label class="flex items-center gap-2 text-xs font-semibold text-zinc-700">
					<input type="checkbox" bind:checked={form.is_visible} class="w-4 h-4 accent-emerald-600" />
					前台可见
				</label>
			</div>

			<div class="flex gap-3 mt-6">
				<button
					type="button"
					onclick={() => (drawerOpen = false)}
					class="flex-1 py-3 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50"
				>
					取消
				</button>
				<button
					type="button"
					onclick={save}
					disabled={saving || !form.name.trim()}
					class="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
				>
					{saving ? '保存中…' : '保存'}
				</button>
			</div>
		</aside>
	</div>
{/if}
