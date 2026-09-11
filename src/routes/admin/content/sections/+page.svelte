<script lang="ts">
	import {
		Plus,
		Pencil,
		Trash2,
		X,
		ExternalLink,
		Layers,
		ArrowUp,
		ArrowDown,
		ImageIcon
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import {
		SECTION_TYPES,
		SECTION_TYPE_LABELS,
		type SectionType,
		type UISectionAction
	} from '$domains/content';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let sections = $state(data.sections.map((s) => ({ ...s })));
	let selectedPageId = $state<string>('all');
	let drawerOpen = $state(false);
	let editingId = $state<string | null>(null);

	interface SectionFormData {
		page: string;
		type: SectionType;
		heading: string;
		subheading: string;
		content: string;
		sort_order: number;
		is_active: boolean;
		actions: UISectionAction[];
	}

	let form = $state<SectionFormData>({
		page: '',
		type: 'hero',
		heading: '',
		subheading: '',
		content: '',
		sort_order: 10,
		is_active: true,
		actions: []
	});

	let saving = $state(false);
	let formError = $state('');
	let error = $state('');
	let successMsg = $state('');

	// Page mapping for easy lookup
	let pageMap = $derived(
		new Map(data.pages.map((p) => [p.id, p]))
	);

	// Filtered sections
	let filteredSections = $derived(
		selectedPageId === 'all'
			? sections
			: sections.filter((s) => s.pageId === selectedPageId)
	);

	function getPageName(pageId: string) {
		const p = pageMap.get(pageId);
		if (!p) return pageId ? '独立区块' : '全局区块';
		return p.title ? `${p.title} (${p.slug})` : p.slug;
	}

	function getTypeBadgeClass(type: SectionType) {
		switch (type) {
			case 'split_showcase':
				return 'bg-rose-50 text-rose-700 border-rose-200';
			case 'hero':
				return 'bg-purple-50 text-purple-700 border-purple-200';
			case 'category_grid':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			case 'product_grid':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			case 'feature_split':
				return 'bg-sky-50 text-sky-700 border-sky-200';
			case 'cta_banner':
				return 'bg-indigo-50 text-indigo-700 border-indigo-200';
			case 'rich_text':
			default:
				return 'bg-zinc-100 text-zinc-700 border-zinc-200';
		}
	}

	async function refresh() {
		try {
			const res = await fetch('/api/admin/content/sections');
			if (res.ok) {
				const body = await res.json();
				sections = body.sections;
			}
		} catch {
			// Silent fallback
		}
	}

	function openNew() {
		editingId = null;
		form = {
			page: selectedPageId !== 'all' ? selectedPageId : data.pages[0]?.id || '',
			type: 'hero',
			heading: '',
			subheading: '',
			content: '',
			sort_order: (sections.length + 1) * 10,
			is_active: true,
			actions: [{ text: '', link: '' }]
		};
		formError = '';
		drawerOpen = true;
	}

	async function openEdit(id: string) {
		formError = '';
		try {
			const res = await fetch(`/api/admin/content/sections/${id}`);
			if (!res.ok) throw new Error('加载区块失败');
			const body = await res.json();
			const sec = body.section;
			editingId = id;
			const actions: UISectionAction[] = sec.settings?.actions || [];
			form = {
				page: sec.page ?? '',
				type: sec.type ?? 'hero',
				heading: sec.heading ?? '',
				subheading: sec.subheading ?? '',
				content: sec.content ?? '',
				sort_order: Number(sec.sort_order) || 10,
				is_active: sec.is_active !== false,
				actions: actions.length > 0 ? actions.map((a) => ({ ...a })) : [{ text: '', link: '' }]
			};
			drawerOpen = true;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '加载失败';
		}
	}

	function addAction() {
		form.actions = [...form.actions, { text: '', link: '' }];
	}

	function removeAction(index: number) {
		form.actions = form.actions.filter((_, idx) => idx !== index);
	}

	async function save() {
		saving = true;
		formError = '';
		try {
			const validActions = form.actions.filter((a) => a.text.trim() || a.link.trim());
			const payload = {
				page: form.page,
				type: form.type,
				heading: form.heading,
				subheading: form.subheading,
				content: form.content,
				sort_order: Number(form.sort_order),
				is_active: form.is_active,
				settings: {
					actions: validActions
				}
			};

			const url = editingId
				? `/api/admin/content/sections/${editingId}`
				: '/api/admin/content/sections';
			const res = await fetch(url, {
				method: editingId ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存区块失败');

			drawerOpen = false;
			successMsg = editingId ? '区块已更新' : '区块已创建';
			setTimeout(() => (successMsg = ''), 3000);
			await refresh();
		} catch (e: unknown) {
			formError = e instanceof Error ? e.message : '保存失败';
		} finally {
			saving = false;
		}
	}

	async function toggleActive(sectionId: string, current: boolean) {
		const next = !current;
		const prev = sections;
		sections = sections.map((s) => (s.id === sectionId ? { ...s, isActive: next } : s));

		try {
			const res = await fetch(`/api/admin/content/sections/${sectionId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: next })
			});
			if (!res.ok) throw new Error('切换状态失败');
		} catch {
			sections = prev;
		}
	}

	async function quickAdjustSort(sectionId: string, delta: number) {
		const sec = sections.find((s) => s.id === sectionId);
		if (!sec) return;
		const nextSort = Math.max(0, sec.sortOrder + delta);
		const prev = sections;
		sections = sections
			.map((s) => (s.id === sectionId ? { ...s, sortOrder: nextSort } : s))
			.sort((a, b) => a.sortOrder - b.sortOrder);

		try {
			const res = await fetch(`/api/admin/content/sections/${sectionId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sort_order: nextSort })
			});
			if (!res.ok) throw new Error('调整排序失败');
		} catch {
			sections = prev;
		}
	}

	async function remove(id: string, heading: string) {
		const title = heading ? `「${heading}」` : '该区块';
		if (!confirm(`确定删除区块 ${title} 吗？`)) return;
		error = '';
		try {
			const res = await fetch(`/api/admin/content/sections/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('删除失败');
			sections = sections.filter((s) => s.id !== id);
			successMsg = '区块已删除';
			setTimeout(() => (successMsg = ''), 3000);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '删除失败';
		}
	}
</script>

<svelte:head>
	<title>页面排版 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-6xl">
	<!-- Top Navigation Tabs & PocketBase Quick Action -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<nav class="flex flex-wrap gap-2" aria-label="内容管理">
			{#each [
				{ href: '/admin/content', label: '站点配置' },
				{ href: '/admin/content/pages', label: '页面管理' },
				{ href: '/admin/content/sections', label: '页面排版' },
				{ href: '/admin/content/navigation', label: '导航管理' }
			] as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.href === '/admin/content/sections' ? 'page' : undefined}
					class="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border {tab.href ===
					'/admin/content/sections'
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

	<!-- Title & Actions Bar -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
				页面区块排版
			</h1>
			<p class="text-xs text-zinc-500 mt-1">
				可视化管理各前台页面的布局区块、核心文案、排序与上下架
			</p>
		</div>

		<button
			type="button"
			onclick={openNew}
			class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 shadow-xs transition-colors shrink-0"
		>
			<UiIcon icon={Plus} size={14} />
			<span>新建区块</span>
		</button>
	</div>

	<!-- Page Filter Tabs -->
	<div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-100">
		<span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-1 shrink-0">
			筛选页面:
		</span>
		<button
			type="button"
			onclick={() => (selectedPageId = 'all')}
			class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 {selectedPageId ===
			'all'
				? 'bg-zinc-900 text-white'
				: 'text-zinc-600 hover:bg-zinc-100'}"
		>
			全部页面 ({sections.length})
		</button>
		{#each data.pages as page (page.id)}
			{@const count = sections.filter((s) => s.pageId === page.id).length}
			<button
				type="button"
				onclick={() => (selectedPageId = page.id)}
				class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 {selectedPageId ===
				page.id
					? 'bg-zinc-900 text-white'
					: 'text-zinc-600 hover:bg-zinc-100'}"
			>
				{page.title ? `${page.title}` : page.slug} ({count})
			</button>
		{/each}
	</div>

	{#if error}
		<p role="alert" class="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
			{error}
		</p>
	{/if}
	{#if successMsg}
		<p role="status" class="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
			{successMsg}
		</p>
	{/if}

	<!-- Sections List Table -->
	<section class="bg-white border border-zinc-200 rounded-card shadow-xs overflow-hidden">
		{#if filteredSections.length === 0}
			<div class="p-12 text-center text-zinc-400">
				<UiIcon icon={Layers} size={36} className="mx-auto mb-3 opacity-40" />
				<p class="text-sm font-medium">当前页面暂无已配置的区块</p>
				<p class="text-xs mt-1">点击右上角「新建区块」可添加新布局</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs text-zinc-600 border-collapse">
					<thead>
						<tr class="border-b border-zinc-200 bg-zinc-50/80 font-semibold uppercase tracking-wider text-zinc-500">
							<th class="py-3 px-4 w-24">排序</th>
							<th class="py-3 px-4 w-44">区块类型</th>
							<th class="py-3 px-4 min-w-[200px]">主标题 / 副标题</th>
							<th class="py-3 px-4 w-36">所属页面</th>
							<th class="py-3 px-4 w-24 text-center">状态</th>
							<th class="py-3 px-4 w-32 text-right">操作</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100">
						{#each filteredSections as row (row.id)}
							<tr class="hover:bg-zinc-50/60 transition-colors">
								<!-- Sort order with quick up/down -->
								<td class="py-3.5 px-4 font-mono font-medium text-zinc-700">
									<div class="flex items-center gap-1.5">
										<span class="w-6 text-center">{row.sortOrder}</span>
										<div class="flex flex-col gap-0.5">
											<button
												type="button"
												onclick={() => quickAdjustSort(row.id, -1)}
												title="升序（靠前）"
												class="p-0.5 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
											>
												<UiIcon icon={ArrowUp} size={11} />
											</button>
											<button
												type="button"
												onclick={() => quickAdjustSort(row.id, 1)}
												title="降序（靠后）"
												class="p-0.5 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
											>
												<UiIcon icon={ArrowDown} size={11} />
											</button>
										</div>
									</div>
								</td>

								<!-- Type Badge -->
								<td class="py-3.5 px-4">
									<span
										class="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium border {getTypeBadgeClass(
											row.type
										)}"
									>
										{SECTION_TYPE_LABELS[row.type] || row.type}
									</span>
								</td>

								<!-- Heading & Subheading -->
								<td class="py-3.5 px-4">
									<div class="font-medium text-zinc-900 text-sm">
										{row.heading || '（无主标题）'}
									</div>
									{#if row.subheading}
										<div class="text-[11px] text-zinc-400 mt-0.5">
											{row.subheading}
										</div>
									{/if}
								</td>

								<!-- Page -->
								<td class="py-3.5 px-4 text-zinc-600 font-medium">
									{getPageName(row.pageId)}
								</td>

								<!-- Active Switch -->
								<td class="py-3.5 px-4 text-center">
									<button
										type="button"
										role="switch"
										aria-checked={row.isActive}
										aria-label="切换启用状态"
										onclick={() => toggleActive(row.id, row.isActive)}
										class="relative inline-flex w-9 h-5 items-center rounded-full transition-colors {row.isActive
											? 'bg-emerald-500'
											: 'bg-zinc-300'}"
									>
										<span
											class="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform {row.isActive
												? 'translate-x-4.5'
												: 'translate-x-1'}"
										></span>
									</button>
								</td>

								<!-- Actions -->
								<td class="py-3.5 px-4 text-right">
									<div class="inline-flex items-center gap-1">
										<button
											type="button"
											onclick={() => openEdit(row.id)}
											class="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
											title="编辑区块"
										>
											<UiIcon icon={Pencil} size={14} />
										</button>
										<button
											type="button"
											onclick={() => remove(row.id, row.heading)}
											class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
											title="删除区块"
										>
											<UiIcon icon={Trash2} size={14} />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Media Asset Notice -->
	<div class="p-4 bg-zinc-50 border border-zinc-200 rounded-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-600">
		<div class="flex items-center gap-2.5">
			<UiIcon icon={ImageIcon} size={16} className="text-zinc-500 shrink-0" />
			<span>
				<strong class="text-zinc-800">媒体资产说明：</strong>
				海报图集、视频背景及高精度资产，推荐前往 PocketBase 数据后台直传并自动接入云存储 CDN。
			</span>
		</div>
		{#if data.pocketbaseUrl}
			<a
				href={`${data.pocketbaseUrl}/_/`}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 font-semibold text-zinc-900 hover:underline shrink-0"
			>
				前往 PocketBase <UiIcon icon={ExternalLink} size={12} />
			</a>
		{/if}
	</div>
</div>

<!-- Edit / Create Section Drawer -->
{#if drawerOpen}
	<div
		class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
			<!-- Drawer Header -->
			<div class="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
				<div>
					<h2 class="text-sm font-bold uppercase tracking-wider text-zinc-900">
						{editingId ? '编辑页面区块' : '新建页面区块'}
					</h2>
					<p class="text-xs text-zinc-500 mt-0.5">配置区块展示文案、类型与行为动作</p>
				</div>
				<button
					type="button"
					onclick={() => (drawerOpen = false)}
					class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60"
				>
					<UiIcon icon={X} size={18} />
				</button>
			</div>

			<!-- Drawer Body -->
			<div class="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-zinc-700">
				{#if formError}
					<p role="alert" class="p-3 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
						{formError}
					</p>
				{/if}

				<!-- Page & Type -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<label class="block">
						<span class="block font-semibold uppercase tracking-wider mb-1 text-zinc-700">
							所属页面 <span class="text-rose-500">*</span>
						</span>
						<select
							bind:value={form.page}
							class="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
						>
							<option value="">（全局 / 独立页面）</option>
							{#each data.pages as p (p.id)}
								<option value={p.id}>{p.title ? `${p.title} (${p.slug})` : p.slug}</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="block font-semibold uppercase tracking-wider mb-1 text-zinc-700">
							区块类型 <span class="text-rose-500">*</span>
						</span>
						<select
							bind:value={form.type}
							class="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
						>
							{#each SECTION_TYPES as t (t)}
								<option value={t}>{SECTION_TYPE_LABELS[t] || t}</option>
							{/each}
						</select>
					</label>
				</div>

				<!-- Sort & Active Status -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
					<label class="block">
						<span class="block font-semibold uppercase tracking-wider mb-1 text-zinc-700">
							排序权重（数字越小越靠前）
						</span>
						<input
							bind:value={form.sort_order}
							type="number"
							min="0"
							step="1"
							class="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</label>

					<div class="block pt-3">
						<span class="block font-semibold uppercase tracking-wider mb-1.5 text-zinc-700">
							启用状态
						</span>
						<button
							type="button"
							role="switch"
							aria-label="切换启用状态"
							aria-checked={form.is_active}
							onclick={() => (form.is_active = !form.is_active)}
							class="relative inline-flex w-10 h-6 items-center rounded-full transition-colors {form.is_active
								? 'bg-emerald-500'
								: 'bg-zinc-300'}"
						>
							<span
								class="inline-block w-4 h-4 rounded-full bg-white transition-transform {form.is_active
									? 'translate-x-5'
									: 'translate-x-1'}"
							></span>
						</button>
						<span class="text-xs text-zinc-500 ml-2">
							{form.is_active ? '前台已发布' : '下架暂存'}
						</span>
					</div>
				</div>

				<!-- Heading & Subheading -->
				<label class="block">
					<span class="block font-semibold uppercase tracking-wider mb-1 text-zinc-700">
						主标题 (Heading)
					</span>
					<input
						bind:value={form.heading}
						type="text"
						placeholder="例如：SPRING 2027 或 GLAMOURIA"
						class="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
					/>
				</label>

				<label class="block">
					<span class="block font-semibold uppercase tracking-wider mb-1 text-zinc-700">
						副标题 (Subheading)
					</span>
					<input
						bind:value={form.subheading}
						type="text"
						placeholder="例如：Shop Now 或 The Narrative"
						class="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
					/>
				</label>

				<!-- Content / Rich Text -->
				<label class="block">
					<span class="block font-semibold uppercase tracking-wider mb-1 text-zinc-700">
						说明文本 / HTML 描述
					</span>
					<textarea
						bind:value={form.content}
						rows="3"
						placeholder="用于富文本或说明卡片的 HTML 或段落内容"
						class="w-full bg-white border border-zinc-300 rounded-xl p-3 text-xs text-zinc-900 font-mono outline-none focus:border-zinc-900"
					></textarea>
				</label>

				<!-- Actions / Buttons -->
				<div class="space-y-3 pt-2 border-t border-zinc-100">
					<div class="flex items-center justify-between">
						<span class="font-semibold uppercase tracking-wider text-zinc-700">
							操作按钮 (Actions)
						</span>
						<button
							type="button"
							onclick={addAction}
							class="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline"
						>
							<UiIcon icon={Plus} size={12} /> 添加按钮
						</button>
					</div>

					{#each form.actions as action, idx (idx)}
						<div class="flex items-center gap-2">
							<input
								bind:value={action.text}
								type="text"
								placeholder="按钮文字 (如 Shop)"
								class="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-900"
							/>
							<input
								bind:value={action.link}
								type="text"
								placeholder="链接 (如 /shop)"
								class="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-900"
							/>
							<button
								type="button"
								onclick={() => removeAction(idx)}
								class="p-1.5 rounded text-rose-500 hover:bg-rose-50"
								title="移除该按钮"
							>
								<UiIcon icon={Trash2} size={13} />
							</button>
						</div>
					{/each}
				</div>

				<!-- PocketBase Media Tip -->
				<div class="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[11px] text-zinc-500 leading-relaxed">
					💡 <strong>提示：</strong>
					如需上传或更换主视觉背景大图、多图轮播图集或视频素材，请前往
					{#if data.pocketbaseUrl}
						<a
							href={`${data.pocketbaseUrl}/_/`}
							target="_blank"
							rel="noopener noreferrer"
							class="text-zinc-900 underline font-semibold"
						>
							PocketBase 后台
						</a>
					{:else}
						PocketBase 后台
					{/if}
					在 <code>ui_sections</code> 集合中直观管理媒体文件。
				</div>
			</div>

			<!-- Drawer Footer -->
			<div class="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-3">
				<button
					type="button"
					onclick={() => (drawerOpen = false)}
					class="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-200/60"
				>
					取消
				</button>
				<button
					type="button"
					onclick={save}
					disabled={saving}
					class="px-5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
				>
					{saving ? '保存中…' : '保存区块'}
				</button>
			</div>
		</div>
	</div>
{/if}
