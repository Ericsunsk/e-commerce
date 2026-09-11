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
		ImageIcon,
		ShoppingBag
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { ADMIN_BUTTONS } from '$shared/kernel';
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

	// Filtered sections (ordered by sortOrder)
	let filteredSections = $derived(
		(selectedPageId === 'all'
			? sections
			: sections.filter((s) => s.pageId === selectedPageId)
		).slice().sort((a, b) => a.sortOrder - b.sortOrder)
	);

	let previewUrl = $derived.by(() => {
		if (selectedPageId === 'all') return '/';
		const page = pageMap.get(selectedPageId);
		if (!page || page.slug === 'home' || page.slug === 'index') return '/';
		return `/${page.slug}`;
	});

	let previewLabel = $derived.by(() => {
		if (selectedPageId === 'all') return '前台首页';
		const page = pageMap.get(selectedPageId);
		if (!page || page.slug === 'home' || page.slug === 'index') return '前台首页';
		return page.title || page.slug;
	});

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

		<div class="flex items-center gap-3">
			<a
				href={previewUrl}
				target="_blank"
				rel="noopener noreferrer"
				class={ADMIN_BUTTONS.secondary}
				title={`在新标签页打开 ${previewLabel} 实时前台页面`}
			>
				<UiIcon icon={ExternalLink} size={14} />
				<span>在新标签页预览 ({previewLabel})</span>
			</a>
			<button
				type="button"
				onclick={openNew}
				class={ADMIN_BUTTONS.primary}
			>
				<UiIcon icon={Plus} size={14} />
				<span>新建区块</span>
			</button>
		</div>
	</div>

	<!-- Page Filter Tabs -->
	<div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-100">
		<span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-1 shrink-0">
			筛选页面:
		</span>
		<button
			type="button"
			onclick={() => (selectedPageId = 'all')}
			class={selectedPageId === 'all'
				? ADMIN_BUTTONS.pillActive
				: ADMIN_BUTTONS.pillInactive}
		>
			全部页面 ({sections.length})
		</button>
		{#each data.pages as page (page.id)}
			{@const count = sections.filter((s) => s.pageId === page.id).length}
			<button
				type="button"
				onclick={() => (selectedPageId = page.id)}
				class={selectedPageId === page.id
					? ADMIN_BUTTONS.pillActive
					: ADMIN_BUTTONS.pillInactive}
			>
				{page.title || page.slug} ({count})
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

	<!-- Visual Block Stream -->
	<div class="space-y-4">
		{#if filteredSections.length === 0}
			<div class="bg-white border border-zinc-200 rounded-card p-12 text-center text-zinc-400">
				<UiIcon icon={Layers} size={40} className="mx-auto mb-3 opacity-40" />
				<p class="text-sm font-medium text-zinc-600">当前页面暂无已配置的区块</p>
				<p class="text-xs mt-1 text-zinc-400">点击右上角「新建区块」可添加新布局</p>
				<button
					type="button"
					onclick={openNew}
					class="{ADMIN_BUTTONS.secondary} mt-4"
				>
					<UiIcon icon={Plus} size={14} />
					<span>新建第一个区块</span>
				</button>
			</div>
		{:else}
			{#each filteredSections as row (row.id)}
				<article
					class="bg-white border border-zinc-200/90 rounded-card overflow-hidden transition-all duration-200 hover:border-zinc-300 hover:shadow-xs group {row.isActive
						? ''
						: 'opacity-75 bg-zinc-50/50'}"
				>
					<!-- Card Header: Metadata + Controls -->
					<div
						class="px-5 py-3 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/60"
					>
						<div class="flex items-center gap-3 min-w-0">
							<!-- Sort Badge with Quick Micro-adjust -->
							<div
								class="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-zinc-200/80 text-xs font-mono font-semibold text-zinc-700 shadow-2xs"
							>
								<span class="min-w-[1.75rem] text-center">#{row.sortOrder}</span>
								<div class="flex flex-col ml-0.5">
									<button
										type="button"
										onclick={() => quickAdjustSort(row.id, -1)}
										title="升序（靠前）"
										class="p-0.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-800 transition-colors"
									>
										<UiIcon icon={ArrowUp} size={10} />
									</button>
									<button
										type="button"
										onclick={() => quickAdjustSort(row.id, 1)}
										title="降序（靠后）"
										class="p-0.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-800 transition-colors"
									>
										<UiIcon icon={ArrowDown} size={10} />
									</button>
								</div>
							</div>

							<!-- Section Type Badge -->
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border {getTypeBadgeClass(
									row.type
								)}"
							>
								{SECTION_TYPE_LABELS[row.type] || row.type}
							</span>

							<!-- Heading & Page Scope -->
							<div class="flex items-baseline gap-2 min-w-0 truncate">
								<h3
									class="font-semibold text-sm text-zinc-900 truncate"
									title={row.heading || '（无主标题）'}
								>
									{row.heading || '（无主标题）'}
								</h3>
								<span class="text-[11px] text-zinc-400 shrink-0 font-normal">
									· {getPageName(row.pageId)}
								</span>
							</div>
						</div>

						<!-- Right Controls -->
						<div class="flex items-center gap-3 shrink-0">
							<!-- Visibility Switch -->
							<div class="flex items-center gap-2">
								<span class="text-[11px] font-medium text-zinc-500">
									{row.isActive ? '前台展示' : '已下架'}
								</span>
								<button
									type="button"
									role="switch"
									aria-checked={row.isActive}
									aria-label="切换启用状态"
									onclick={() => toggleActive(row.id, row.isActive)}
									class="relative inline-flex w-8 h-4.5 items-center rounded-full transition-colors {row.isActive
										? 'bg-emerald-500'
										: 'bg-zinc-300'}"
								>
									<span
										class="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform {row.isActive
											? 'translate-x-4'
											: 'translate-x-0.5'}"
									></span>
								</button>
							</div>

							<div class="h-3.5 w-px bg-zinc-200"></div>

							<!-- Edit & Delete -->
							<div class="inline-flex items-center gap-1">
								<button
									type="button"
									onclick={() => openEdit(row.id)}
									class={ADMIN_BUTTONS.icon}
									title="编辑区块配置"
								>
									<UiIcon icon={Pencil} size={14} />
								</button>
								<button
									type="button"
									onclick={() => remove(row.id, row.heading)}
									class={ADMIN_BUTTONS.danger}
									title="删除区块"
								>
									<UiIcon icon={Trash2} size={14} />
								</button>
							</div>
						</div>
					</div>

					<!-- Card Body: Miniature Visual Preview -->
					<div class="p-4 sm:p-5 bg-zinc-50/40">
						{#if row.type === 'hero'}
							<!-- Hero Section Preview -->
							<div
								class="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center text-center p-6 select-none border border-zinc-900/10 shadow-inner"
							>
								{#if row.imageUrl}
									<img
										src={row.imageUrl}
										alt={row.heading}
										class="absolute inset-0 w-full h-full object-cover opacity-60"
									/>
								{:else}
									<div
										class="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800"
									>
										<div
											class="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
										></div>
									</div>
								{/if}
								<div class="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]"></div>

								<div class="relative z-10 max-w-lg mx-auto space-y-2 text-white">
									{#if row.subheading}
										<p class="text-[10px] uppercase font-mono tracking-[0.25em] text-zinc-300">
											{row.subheading}
										</p>
									{/if}
									<h4
										class="text-lg sm:text-2xl font-display font-bold uppercase tracking-widest text-white leading-tight"
									>
										{row.heading || 'HERO MAIN FOCUS'}
									</h4>
									<div class="pt-1.5 flex items-center justify-center gap-2">
										<span
											class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-white text-zinc-900 shadow-xs"
										>
											{row.settings?.actions?.[0]?.text || 'EXPLORE NOW'}
										</span>
									</div>
								</div>
							</div>
						{:else if row.type === 'split_showcase'}
							<!-- Split Showcase Preview -->
							<div class="grid grid-cols-2 gap-3 h-40 sm:h-48 select-none">
								<div
									class="relative rounded-xl overflow-hidden bg-zinc-900 flex flex-col justify-end p-4 text-white border border-zinc-800"
								>
									{#if row.imageUrl}
										<img
											src={row.imageUrl}
											alt=""
											class="absolute inset-0 w-full h-full object-cover opacity-75"
										/>
									{:else}
										<div class="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950"></div>
									{/if}
									<div
										class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
									></div>
									<div class="relative z-10">
										<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400"
											>ATELIER 01</span
										>
										<p
											class="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-white"
										>
											{row.heading || 'WOMEN COLLECTION'}
										</p>
									</div>
								</div>

								<div
									class="relative rounded-xl overflow-hidden bg-zinc-950 flex flex-col justify-end p-4 text-white border border-zinc-800"
								>
									<div class="absolute inset-0 bg-gradient-to-b from-zinc-800 to-black"></div>
									<div
										class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
									></div>
									<div class="relative z-10">
										<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400"
											>ATELIER 02</span
										>
										<p
											class="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-white"
										>
											{row.subheading || 'MEN SELECTION'}
										</p>
									</div>
								</div>
							</div>
						{:else if row.type === 'feature_split'}
							<!-- Feature Split Preview -->
							<div
								class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-zinc-200/80 items-center select-none"
							>
								<div
									class="relative rounded-lg overflow-hidden h-32 bg-zinc-100 flex items-center justify-center border border-zinc-200/50"
								>
									{#if row.imageUrl}
										<img src={row.imageUrl} alt="" class="w-full h-full object-cover" />
									{:else}
										<div class="text-zinc-400 flex flex-col items-center gap-1.5">
											<UiIcon icon={ImageIcon} size={22} />
											<span class="text-[10px] font-mono">EDITORIAL VISUAL</span>
										</div>
									{/if}
								</div>
								<div class="space-y-1.5 py-1 pr-2">
									<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400">
										{row.subheading || 'HERITAGE CRAFT'}
									</span>
									<h4
										class="text-sm sm:text-base font-display font-bold uppercase text-zinc-900 tracking-wider"
									>
										{row.heading || 'DESIGN PHILOSOPHY'}
									</h4>
									<p class="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
										{row.content ||
											'探索优雅与前卫工艺的融合，每一道剪裁皆经过手工雕琢，呈现历久弥新的高定风尚。'}
									</p>
									<div class="pt-0.5">
										<span
											class="text-[10px] font-bold uppercase tracking-wider text-zinc-900 underline underline-offset-4"
										>
											{row.settings?.actions?.[0]?.text || 'READ THE STORY'} →
										</span>
									</div>
								</div>
							</div>
						{:else if row.type === 'product_grid'}
							<!-- Product Grid Preview -->
							<div class="bg-white p-4 rounded-xl border border-zinc-200/80 space-y-3 select-none">
								<div class="flex items-center justify-between border-b border-zinc-100 pb-2">
									<div>
										<span class="text-[9px] font-mono uppercase tracking-widest text-zinc-400"
											>SHOWCASE</span
										>
										<h4 class="text-xs font-bold uppercase tracking-wider text-zinc-900">
											{row.heading || 'CURATED SELECTION'}
										</h4>
									</div>
									<span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider"
										>VIEW ALL (16)</span
									>
								</div>
								<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
									{#each [{ title: 'Wool Tailored Blazer', price: '¥ 3,490' }, { title: 'Silk Pleated Dress', price: '¥ 2,850' }, { title: 'Cashmere Knit Top', price: '¥ 1,980' }, { title: 'Leather Mini Bag', price: '¥ 4,200' }] as item}
										<div
											class="bg-zinc-50/80 rounded-lg p-2 border border-zinc-200/40 text-center space-y-1.5"
										>
											<div
												class="aspect-3/4 rounded bg-zinc-200/60 flex items-center justify-center text-zinc-400"
											>
												<UiIcon icon={ShoppingBag} size={16} className="opacity-50" />
											</div>
											<div class="text-[10px] font-medium text-zinc-800 truncate">{item.title}</div>
											<div class="text-[9px] font-mono font-bold text-zinc-500">{item.price}</div>
										</div>
									{/each}
								</div>
							</div>
						{:else if row.type === 'category_grid'}
							<!-- Category Grid Preview -->
							<div class="bg-white p-4 rounded-xl border border-zinc-200/80 space-y-3 select-none">
								<div class="flex items-center justify-between border-b border-zinc-100 pb-2">
									<div>
										<span class="text-[9px] font-mono uppercase tracking-widest text-zinc-400"
											>CATEGORIES</span
										>
										<h4 class="text-xs font-bold uppercase tracking-wider text-zinc-900">
											{row.heading || 'EXPLORE BY CATEGORY'}
										</h4>
									</div>
									<span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider"
										>3 COLLECTIONS</span
									>
								</div>
								<div class="grid grid-cols-3 gap-2.5">
									{#each ['OUTERWEAR', 'LEATHER GOODS', 'ACCESSORIES'] as cat, idx}
										<div
											class="relative h-20 sm:h-24 rounded-lg overflow-hidden bg-zinc-900 flex items-end p-2.5 text-white border border-zinc-800"
										>
											<div
												class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/60 to-transparent"
											></div>
											<div class="relative z-10">
												<span class="text-[8px] font-mono text-zinc-400">0{idx + 1}</span>
												<div class="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
													{cat}
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else if row.type === 'cta_banner'}
							<!-- CTA Banner Preview -->
							<div
								class="bg-zinc-900 text-white p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-zinc-800 select-none shadow-xs"
							>
								<div class="space-y-1">
									<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400">
										{row.subheading || 'NEWSLETTER & EXCLUSIVES'}
									</span>
									<h4
										class="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-white"
									>
										{row.heading || 'JOIN THE PRIVILEGE CLUB'}
									</h4>
								</div>
								<span
									class="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-bold tracking-wider uppercase shrink-0 shadow-xs"
								>
									{row.settings?.actions?.[0]?.text || 'SUBSCRIBE NOW'}
								</span>
							</div>
						{:else}
							<!-- Rich Text Preview -->
							<div
								class="bg-white p-6 rounded-xl border border-zinc-200/80 text-center max-w-xl mx-auto space-y-2 select-none"
							>
								{#if row.subheading}
									<span class="text-[9px] font-mono tracking-widest uppercase text-zinc-400">
										{row.subheading}
									</span>
								{/if}
								<h4
									class="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-zinc-900"
								>
									{row.heading || 'EDITORIAL STORY'}
								</h4>
								<p
									class="text-xs text-zinc-600 line-clamp-3 leading-relaxed font-serif italic max-w-md mx-auto"
								>
									{row.content ||
										'“真正的奢华无需繁复的堆砌，而是经由纯粹线条与高级质感唤醒的内在从容。”'}
								</p>
							</div>
						{/if}
					</div>
				</article>
			{/each}
		{/if}
	</div>

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
					class={ADMIN_BUTTONS.icon}
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
								class={ADMIN_BUTTONS.danger}
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
					class={ADMIN_BUTTONS.secondary}
				>
					取消
				</button>
				<button
					type="button"
					onclick={save}
					disabled={saving}
					class={ADMIN_BUTTONS.primary}
				>
					{saving ? '保存中…' : '保存区块'}
				</button>
			</div>
		</div>
	</div>
{/if}
