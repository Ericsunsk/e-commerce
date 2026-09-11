<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import {
		CircleAlert,
		Image as ImageIcon,
		Plus,
		Search,
		SearchX,
		Tags,
		Package,
		CheckCircle2,
		Eye,
		EyeOff,
		AlertTriangle,
		ExternalLink,
		X,
		Layers,
		Sparkles,
		Pencil,
		Trash2,
		ListFilter,
		ArrowUpDown,
		Check
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import {
		ADMIN_PAGE,
		ADMIN_CARDS,
		ADMIN_BADGES,
		ADMIN_BUTTONS,
		ADMIN_TABLE,
		ADMIN_DRAWER
	} from '$shared/kernel';
	import type { PageData } from './$types';
	import type { AdminProductRow } from '$domains/catalog';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state<AdminProductRow[]>(data.products.map((p) => ({ ...p })));
	let pendingIds = new SvelteSet<string>();
	let error = $state('');
	let search = $state('');

	// Filter states (Multi-selection)
	let selectedCategoryIds = $state<string[]>([]);
	let selectedStatuses = $state<('active' | 'inactive')[]>([]);
	let selectedStocks = $state<('in_stock' | 'low_stock' | 'out_of_stock')[]>([]);
	let onlyFeatured = $state(false);

	// Popover open states
	let isFilterOpen = $state(false);
	let isSortOpen = $state(false);

	// Sort states
	type SortOption =
		| 'default'
		| 'price_asc'
		| 'price_desc'
		| 'stock_asc'
		| 'stock_desc'
		| 'title_asc'
		| 'title_desc';
	let sortBy = $state<SortOption>('default');

	const sortOptions: { id: SortOption; label: string }[] = [
		{ id: 'default', label: '默认排序' },
		{ id: 'price_asc', label: '价格：从低到高' },
		{ id: 'price_desc', label: '价格：从高到低' },
		{ id: 'stock_asc', label: '库存：从低到高' },
		{ id: 'stock_desc', label: '库存：从高到低' },
		{ id: 'title_asc', label: '名称：A 到 Z' },
		{ id: 'title_desc', label: '名称：Z 到 A' }
	];

	function toggleCategoryFilter(id: string) {
		if (selectedCategoryIds.includes(id)) {
			selectedCategoryIds = selectedCategoryIds.filter((x) => x !== id);
		} else {
			selectedCategoryIds = [...selectedCategoryIds, id];
		}
	}

	function toggleStatusFilter(status: 'active' | 'inactive') {
		if (selectedStatuses.includes(status)) {
			selectedStatuses = selectedStatuses.filter((s) => s !== status);
		} else {
			selectedStatuses = [...selectedStatuses, status];
		}
	}

	function toggleStockFilter(stock: 'in_stock' | 'low_stock' | 'out_of_stock') {
		if (selectedStocks.includes(stock)) {
			selectedStocks = selectedStocks.filter((s) => s !== stock);
		} else {
			selectedStocks = [...selectedStocks, stock];
		}
	}

	function resetFilters() {
		selectedCategoryIds = [];
		selectedStatuses = [];
		selectedStocks = [];
	}

	function resetAll() {
		search = '';
		selectedCategoryIds = [];
		selectedStatuses = [];
		selectedStocks = [];
		onlyFeatured = false;
		sortBy = 'default';
		isFilterOpen = false;
		isSortOpen = false;
	}

	let activeFilterCount = $derived(
		selectedCategoryIds.length + selectedStatuses.length + selectedStocks.length
	);

	let hasActiveControls = $derived(
		Boolean(search || activeFilterCount > 0 || onlyFeatured || sortBy !== 'default')
	);

	// Quick drawer for variant inspection
	let inspectProduct = $state<AdminProductRow | null>(null);

	// Summary KPI Metrics
	let totalProducts = $derived(rows.length);
	let activeProducts = $derived(rows.filter((r) => r.isActive).length);
	let inactiveProducts = $derived(rows.filter((r) => !r.isActive).length);
	let inStockProducts = $derived(rows.filter((r) => r.totalStock > 5).length);
	let lowStockProducts = $derived(rows.filter((r) => r.totalStock > 0 && r.totalStock <= 5).length);
	let alertProducts = $derived(rows.filter((r) => r.totalStock <= 5).length);
	let outOfStockProducts = $derived(rows.filter((r) => r.totalStock === 0).length);

	// Filtered and sorted product rows
	let visibleRows = $derived.by(() => {
		const filtered = rows.filter((row) => {
			// Search filter: title, slug, sku
			const q = search.trim().toLowerCase();
			if (q) {
				const titleMatch = row.title.toLowerCase().includes(q);
				const slugMatch = row.slug.toLowerCase().includes(q);
				const skuMatch =
					row.variants?.some((v: { sku: string }) => v.sku.toLowerCase().includes(q)) ?? false;
				if (!titleMatch && !slugMatch && !skuMatch) return false;
			}

			// Category multi-select filter
			if (selectedCategoryIds.length > 0) {
				const matchesCategory = row.categories?.some(
					(c: { id: string; slug: string }) =>
						selectedCategoryIds.includes(c.id) || selectedCategoryIds.includes(c.slug)
				);
				if (!matchesCategory) return false;
			}

			// Status multi-select filter
			if (selectedStatuses.length > 0) {
				const statusMatch =
					(selectedStatuses.includes('active') && row.isActive) ||
					(selectedStatuses.includes('inactive') && !row.isActive);
				if (!statusMatch) return false;
			}

			// Stock multi-select filter
			if (selectedStocks.length > 0) {
				const stockStatus =
					row.totalStock === 0
						? 'out_of_stock'
						: row.totalStock <= 5
							? 'low_stock'
							: 'in_stock';
				if (!selectedStocks.includes(stockStatus)) return false;
			}

			// Featured filter
			if (onlyFeatured && !row.isFeatured) return false;

			return true;
		});

		if (sortBy === 'default') return filtered;

		const sorted = [...filtered];
		switch (sortBy) {
			case 'price_asc':
				return sorted.sort((a, b) => a.priceValue - b.priceValue);
			case 'price_desc':
				return sorted.sort((a, b) => b.priceValue - a.priceValue);
			case 'stock_asc':
				return sorted.sort((a, b) => a.totalStock - b.totalStock);
			case 'stock_desc':
				return sorted.sort((a, b) => b.totalStock - a.totalStock);
			case 'title_asc':
				return sorted.sort((a, b) => a.title.localeCompare(b.title));
			case 'title_desc':
				return sorted.sort((a, b) => b.title.localeCompare(a.title));
			default:
				return sorted;
		}
	});

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
			error = e instanceof Error ? e.message : '切换状态失败';
		} finally {
			pendingIds.delete(id);
		}
	}

	interface CategoryItem {
		id: string;
		name: string;
		slug: string;
		sortOrder?: number;
		isActive?: boolean;
		productCount?: number;
		description?: string;
	}

	// svelte-ignore state_referenced_locally
	let categories = $state<CategoryItem[]>(
		data.categories.map((c) => ({
			id: c.id,
			name: c.name || (c as { title?: string }).title || c.slug,
			slug: c.slug,
			sortOrder: c.sortOrder,
			isActive: c.isVisible
		}))
	);
	let categoryModalOpen = $state(false);
	let categoryLoading = $state(false);
	let categorySaving = $state(false);
	let categoryModalError = $state('');
	let categoryEditingId = $state<string | null>(null);
	let categoryForm = $state({
		name: '',
		slug: '',
		sort_order: 0,
		description: '',
		is_visible: true
	});
	let showCategoryForm = $state(false);

	async function refreshCategories() {
		categoryLoading = true;
		try {
			const res = await fetch('/api/admin/categories');
			if (res.ok) {
				const body = await res.json();
				if (Array.isArray(body.categories)) {
					categories = body.categories;
				}
			}
		} catch {
			// Keep current state on network failure
		} finally {
			categoryLoading = false;
		}
	}

	function openCategoryModal() {
		categoryModalOpen = true;
		categoryModalError = '';
		showCategoryForm = false;
		categoryEditingId = null;
		refreshCategories();
	}

	function openNewCategory() {
		categoryEditingId = null;
		categoryForm = {
			name: '',
			slug: '',
			sort_order: categories.length + 1,
			description: '',
			is_visible: true
		};
		categoryModalError = '';
		showCategoryForm = true;
	}

	function openEditCategory(cat: CategoryItem) {
		categoryEditingId = cat.id;
		categoryForm = {
			name: cat.name,
			slug: cat.slug,
			sort_order: cat.sortOrder ?? 0,
			description: cat.description ?? '',
			is_visible: cat.isActive !== false
		};
		categoryModalError = '';
		showCategoryForm = true;
	}

	async function saveCategory() {
		if (!categoryForm.name.trim()) {
			categoryModalError = '分类名称不能为空';
			return;
		}
		categorySaving = true;
		categoryModalError = '';
		try {
			const url = categoryEditingId
				? `/api/admin/categories/${categoryEditingId}`
				: '/api/admin/categories';
			const res = await fetch(url, {
				method: categoryEditingId ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(categoryForm)
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存分类失败');
			showCategoryForm = false;
			categoryEditingId = null;
			await refreshCategories();
		} catch (e: unknown) {
			categoryModalError = e instanceof Error ? e.message : '保存分类失败';
		} finally {
			categorySaving = false;
		}
	}

	async function toggleCategoryVisibility(cat: CategoryItem) {
		const next = !(cat.isActive !== false);
		const previous = categories;
		categories = categories.map((c) => (c.id === cat.id ? { ...c, isActive: next } : c));
		try {
			const res = await fetch(`/api/admin/categories/${cat.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: cat.name, slug: cat.slug, is_visible: next })
			});
			if (!res.ok) throw new Error('切换显隐状态失败');
			await refreshCategories();
		} catch (e: unknown) {
			categories = previous;
			categoryModalError = e instanceof Error ? e.message : '切换显隐状态失败';
		}
	}

	async function deleteCategory(cat: CategoryItem) {
		if ((cat.productCount ?? 0) > 0) {
			categoryModalError = `分类「${cat.name}」下仍有 ${cat.productCount} 个商品关联，无法直接删除。请先在商品编辑中解绑分类后再试。`;
			return;
		}
		if (!confirm(`确定彻底删除分类「${cat.name}」吗？`)) return;
		categoryModalError = '';
		try {
			const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '删除分类失败');
			categories = categories.filter((c) => c.id !== cat.id);
			await refreshCategories();
		} catch (e: unknown) {
			categoryModalError = e instanceof Error ? e.message : '删除分类失败';
		}
	}
</script>

<svelte:head>
	<title>商品管理工作台 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class={ADMIN_PAGE.container}>
	<!-- Top Bar -->
	<div class={ADMIN_PAGE.header}>
		<div>
			<h1 class={ADMIN_PAGE.title}>商品管理工作台</h1>
			<p class={ADMIN_PAGE.subtitle}>
				监控商品生命周期、实时库存余量、多维属性与前台销售上架状态
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button type="button" onclick={openCategoryModal} class={ADMIN_BUTTONS.secondary}>
				<UiIcon icon={Tags} size={15} />
				<span>分类管理</span>
			</button>

			<a href="/admin/products/new" class={ADMIN_BUTTONS.primary}>
				<UiIcon icon={Plus} size={15} />
				<span>新建商品</span>
			</a>
		</div>
	</div>

	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium shadow-2xs"
		>
			<UiIcon icon={CircleAlert} size={16} class="shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- 4-Card KPI Overview -->
	<div class={ADMIN_CARDS.grid4}>
		<!-- KPI 1: 全部商品 -->
		<div class={ADMIN_CARDS.kpi}>
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
					<UiIcon icon={Package} size={15} class="text-zinc-600" />
					商品总数
				</span>
				<span class={ADMIN_BADGES.neutral}>Catalog</span>
			</div>
			<div class="mt-4">
				<div class="text-2xl font-display font-bold text-zinc-900 tracking-tight">
					{totalProducts} <span class="text-xs font-normal text-zinc-400">款 SPU</span>
				</div>
				<p class="text-[11px] text-zinc-400 mt-1">涵盖商城当前所有建档款目</p>
			</div>
		</div>

		<!-- KPI 2: 在售在架 -->
		<div class={ADMIN_CARDS.kpi}>
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
					<UiIcon icon={CheckCircle2} size={15} class="text-emerald-600" />
					在售在架
				</span>
				<span class={ADMIN_BADGES.success}>Active</span>
			</div>
			<div class="mt-4">
				<div class="text-2xl font-display font-bold text-zinc-900 tracking-tight">
					{activeProducts} <span class="text-xs font-normal text-zinc-400">款在售</span>
				</div>
				<p class="text-[11px] text-zinc-400 mt-1">
					占比 {totalProducts > 0 ? Math.round((activeProducts / totalProducts) * 100) : 0}% 正常接单中
				</p>
			</div>
		</div>

		<!-- KPI 3: 下架暂存 -->
		<div class={ADMIN_CARDS.kpi}>
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
					<UiIcon icon={EyeOff} size={15} class="text-zinc-400" />
					下架暂存
				</span>
				<span class={ADMIN_BADGES.neutral}>Hidden</span>
			</div>
			<div class="mt-4">
				<div class="text-2xl font-display font-bold text-zinc-900 tracking-tight">
					{inactiveProducts} <span class="text-xs font-normal text-zinc-400">款下架</span>
				</div>
				<p class="text-[11px] text-zinc-400 mt-1">前台隐身，保留历史价格与销售数据</p>
			</div>
		</div>

		<!-- KPI 4: 库存预警 -->
		<div class={ADMIN_CARDS.kpi}>
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
					<UiIcon icon={AlertTriangle} size={15} class="text-amber-600" />
					库存紧张 / 缺货
				</span>
				<span class={outOfStockProducts > 0 ? ADMIN_BADGES.danger : ADMIN_BADGES.warning}>
					{outOfStockProducts > 0 ? `${outOfStockProducts} 缺货` : '告警'}
				</span>
			</div>
			<div class="mt-4">
				<div class="text-2xl font-display font-bold text-zinc-900 tracking-tight">
					{alertProducts} <span class="text-xs font-normal text-zinc-400">款需补货</span>
				</div>
				<p class="text-[11px] text-zinc-400 mt-1">库存 ≤5 件或已完全售罄</p>
			</div>
		</div>
	</div>

	<!-- Products Section (Toolbar + Table grouped as one unit with 1/2 spacing) -->
	<div class="space-y-3">
		<!-- Search & Filters Toolbar (Search on left, Action icons right-aligned) -->
		<div class="flex flex-wrap items-center justify-between gap-2.5">
		<!-- 1. Search Box (Native 'x' removed) -->
		<div class="relative w-full sm:w-64 md:w-72 shrink-0">
			<UiIcon
				icon={Search}
				size={15}
				class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
			/>
			<input
				type="text"
				placeholder="搜索商品标题或变体 SKU..."
				bind:value={search}
				aria-label="搜索商品"
				class="w-full h-9 bg-white border border-zinc-200 rounded-card pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 transition-colors [&::-webkit-search-cancel-button]:appearance-none"
			/>
		</div>

		<!-- 2. Action Icons Grouped & Aligned to Right -->
		<div class="flex items-center gap-2 ml-auto">
			<!-- 筛选 (Filter) Multi-select Popover -->
			<div class="relative">
				<button
					type="button"
					onclick={() => {
						isFilterOpen = !isFilterOpen;
						if (isFilterOpen) isSortOpen = false;
					}}
					title="多维筛选 (分类/上架/库存)"
					aria-label="多维筛选"
					class="relative {activeFilterCount > 0
						? ADMIN_BUTTONS.iconToolbarActive
						: isFilterOpen
							? 'h-9 w-9 inline-flex items-center justify-center rounded-card border border-zinc-300 bg-zinc-100 text-zinc-900 transition-colors cursor-pointer shrink-0'
							: ADMIN_BUTTONS.iconToolbarInactive}"
				>
					<UiIcon icon={ListFilter} size={15} />
					{#if activeFilterCount > 0}
						<span class={ADMIN_BUTTONS.iconBadge}>
							{activeFilterCount}
						</span>
					{/if}
				</button>

				{#if isFilterOpen}
					<button
						type="button"
						class="fixed inset-0 z-20 cursor-default"
						onclick={() => (isFilterOpen = false)}
						aria-label="关闭筛选菜单"
					></button>
					<div
						class="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-white border border-zinc-200 rounded-card p-4 z-30 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-100"
					>
						<div class="flex items-center justify-between pb-2 border-b border-zinc-100">
							<div class="flex items-center gap-1.5">
								<UiIcon icon={ListFilter} size={14} class="text-zinc-700" />
								<span class="text-xs font-bold uppercase tracking-wider text-zinc-900">商品多维筛选</span>
							</div>
							{#if activeFilterCount > 0}
								<button
									type="button"
									onclick={resetFilters}
									class="text-[11px] text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
								>
									清空筛选 ({activeFilterCount})
								</button>
							{/if}
						</div>

						<!-- 所属分类 (可多选) -->
						<div>
							<div class="flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
								<span>所属分类</span>
								{#if selectedCategoryIds.length > 0}
									<button
										type="button"
										onclick={() => (selectedCategoryIds = [])}
										class="text-[10px] text-zinc-400 hover:text-zinc-700 font-normal normal-case cursor-pointer"
									>
										重置
									</button>
								{/if}
							</div>
							{#if categories.length === 0}
								<p class="text-xs text-zinc-400">暂无分类数据</p>
							{:else}
								<div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
									{#each categories as cat (cat.id)}
										{@const isSelected = selectedCategoryIds.includes(cat.id)}
										{@const count = rows.filter((r) => r.categories?.some((c: { id: string }) => c.id === cat.id)).length}
										<button
											type="button"
											onclick={() => toggleCategoryFilter(cat.id)}
											class="px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer {isSelected
												? 'bg-zinc-900 text-white border-zinc-900 font-medium'
												: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'}"
										>
											{#if isSelected}
												<UiIcon icon={Check} size={11} class="text-white shrink-0" />
											{/if}
											<span>{cat.name || cat.slug}</span>
											<span class="text-[10px] {isSelected ? 'text-zinc-300' : 'text-zinc-400'}">({count})</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>

						<!-- 上架状态 (可多选) -->
						<div>
							<div class="flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
								<span>上架状态</span>
								{#if selectedStatuses.length > 0}
									<button
										type="button"
										onclick={() => (selectedStatuses = [])}
										class="text-[10px] text-zinc-400 hover:text-zinc-700 font-normal normal-case cursor-pointer"
									>
										重置
									</button>
								{/if}
							</div>
							<div class="flex flex-wrap gap-1.5">
								<button
									type="button"
									onclick={() => toggleStatusFilter('active')}
									class="px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer {selectedStatuses.includes('active')
										? 'bg-zinc-900 text-white border-zinc-900 font-medium'
										: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'}"
								>
									{#if selectedStatuses.includes('active')}
										<UiIcon icon={Check} size={11} class="text-white shrink-0" />
									{/if}
									<span>在售在架</span>
									<span class="text-[10px] {selectedStatuses.includes('active') ? 'text-zinc-300' : 'text-zinc-400'}">({activeProducts})</span>
								</button>

								<button
									type="button"
									onclick={() => toggleStatusFilter('inactive')}
									class="px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer {selectedStatuses.includes('inactive')
										? 'bg-zinc-900 text-white border-zinc-900 font-medium'
										: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'}"
								>
									{#if selectedStatuses.includes('inactive')}
										<UiIcon icon={Check} size={11} class="text-white shrink-0" />
									{/if}
									<span>下架暂存</span>
									<span class="text-[10px] {selectedStatuses.includes('inactive') ? 'text-zinc-300' : 'text-zinc-400'}">({inactiveProducts})</span>
								</button>
							</div>
						</div>

						<!-- 库存状态 (可多选) -->
						<div>
							<div class="flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
								<span>库存状态</span>
								{#if selectedStocks.length > 0}
									<button
										type="button"
										onclick={() => (selectedStocks = [])}
										class="text-[10px] text-zinc-400 hover:text-zinc-700 font-normal normal-case cursor-pointer"
									>
										重置
									</button>
								{/if}
							</div>
							<div class="flex flex-wrap gap-1.5">
								<button
									type="button"
									onclick={() => toggleStockFilter('in_stock')}
									class="px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer {selectedStocks.includes('in_stock')
										? 'bg-zinc-900 text-white border-zinc-900 font-medium'
										: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'}"
								>
									{#if selectedStocks.includes('in_stock')}
										<UiIcon icon={Check} size={11} class="text-white shrink-0" />
									{/if}
									<span>库存充足</span>
									<span class="text-[10px] {selectedStocks.includes('in_stock') ? 'text-zinc-300' : 'text-zinc-400'}">({inStockProducts})</span>
								</button>

								<button
									type="button"
									onclick={() => toggleStockFilter('low_stock')}
									class="px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer {selectedStocks.includes('low_stock')
										? 'bg-zinc-900 text-white border-zinc-900 font-medium'
										: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'}"
								>
									{#if selectedStocks.includes('low_stock')}
										<UiIcon icon={Check} size={11} class="text-white shrink-0" />
									{/if}
									<span>库存紧张</span>
									<span class="text-[10px] {selectedStocks.includes('low_stock') ? 'text-zinc-300' : 'text-zinc-400'}">({lowStockProducts})</span>
								</button>

								<button
									type="button"
									onclick={() => toggleStockFilter('out_of_stock')}
									class="px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer {selectedStocks.includes('out_of_stock')
										? 'bg-zinc-900 text-white border-zinc-900 font-medium'
										: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'}"
								>
									{#if selectedStocks.includes('out_of_stock')}
										<UiIcon icon={Check} size={11} class="text-white shrink-0" />
									{/if}
									<span>已售罄</span>
									<span class="text-[10px] {selectedStocks.includes('out_of_stock') ? 'text-zinc-300' : 'text-zinc-400'}">({outOfStockProducts})</span>
								</button>
							</div>
						</div>

						<!-- Footer -->
						<div class="flex items-center justify-end pt-2 border-t border-zinc-100">
							<button
								type="button"
								onclick={() => (isFilterOpen = false)}
								class="text-xs px-3.5 py-1.5 rounded-card bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
							>
								完成
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- 精选 (Featured) Toggle Icon -->
			<button
				type="button"
				onclick={() => (onlyFeatured = !onlyFeatured)}
				title={onlyFeatured ? '显示全部商品' : '仅看精选推荐'}
				aria-label="仅看精选推荐"
				class={onlyFeatured ? ADMIN_BUTTONS.iconToolbarActive : ADMIN_BUTTONS.iconToolbarInactive}
			>
				<UiIcon icon={Sparkles} size={15} />
			</button>

			<!-- 排序 (Sort) Dropdown Icon -->
			<div class="relative">
				<button
					type="button"
					onclick={() => {
						isSortOpen = !isSortOpen;
						if (isSortOpen) isFilterOpen = false;
					}}
					title="排序方式"
					aria-label="排序方式"
					class="relative {sortBy !== 'default'
						? ADMIN_BUTTONS.iconToolbarActive
						: isSortOpen
							? 'h-9 w-9 inline-flex items-center justify-center rounded-card border border-zinc-300 bg-zinc-100 text-zinc-900 transition-colors cursor-pointer shrink-0'
							: ADMIN_BUTTONS.iconToolbarInactive}"
				>
					<UiIcon icon={ArrowUpDown} size={15} />
				</button>

				{#if isSortOpen}
					<button
						type="button"
						class="fixed inset-0 z-20 cursor-default"
						onclick={() => (isSortOpen = false)}
						aria-label="关闭排序菜单"
					></button>
					<div
						class="absolute right-0 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-card p-1.5 z-30 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
					>
						<div class="px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
							排序方式
						</div>
						{#each sortOptions as opt (opt.id)}
							<button
								type="button"
								onclick={() => {
									sortBy = opt.id;
									isSortOpen = false;
								}}
								class="w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer {sortBy === opt.id
									? 'bg-zinc-100 text-zinc-900 font-semibold'
									: 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'}"
							>
								<span>{opt.label}</span>
								{#if sortBy === opt.id}
									<UiIcon icon={Check} size={13} class="text-zinc-900" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Table Card -->
	<div class={ADMIN_CARDS.table}>
		<div class={ADMIN_TABLE.wrapper}>
			<table class={ADMIN_TABLE.table}>
				<thead>
					<tr class={ADMIN_TABLE.headerRow}>
						<th class={ADMIN_TABLE.headerCell}>商品款目</th>
						<th class={ADMIN_TABLE.headerCell}>零售价格</th>
						<th class="{ADMIN_TABLE.headerCell} text-right">总可用库存</th>
						<th class="{ADMIN_TABLE.headerCell} text-center">变体规格</th>
						<th class="{ADMIN_TABLE.headerCell} text-center">所属分类</th>
						<th class="{ADMIN_TABLE.headerCell} text-center">在售状态</th>
						<th class="{ADMIN_TABLE.headerCell} text-right">快捷操作</th>
					</tr>
				</thead>
				<tbody class={ADMIN_TABLE.body}>
					{#each visibleRows as row (row.id)}
						<tr class={ADMIN_TABLE.row}>
							<!-- Product Image & Title -->
							<td class={ADMIN_TABLE.cell}>
								<div class="flex items-center gap-3.5">
									{#if row.image}
										<img
											src={row.image}
											alt=""
											class="w-11 h-13 object-cover rounded-lg border border-zinc-200 shrink-0 bg-zinc-100 shadow-2xs"
											loading="lazy"
										/>
									{:else}
										<div
											class="w-11 h-13 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0"
										>
											<UiIcon icon={ImageIcon} size={18} />
										</div>
									{/if}
									<div class="min-w-0 max-w-[280px]">
										<div class="flex items-center gap-1.5">
											<a
												href="/admin/products/{row.id}"
												class="text-xs font-semibold text-zinc-900 hover:text-black hover:underline truncate"
											>
												{row.title}
											</a>
											{#if row.isFeatured}
												<span class="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 font-mono shrink-0">
													精选
												</span>
											{/if}
										</div>
									</div>
								</div>
							</td>

							<!-- Price -->
							<td class="{ADMIN_TABLE.cell} font-bold font-mono text-zinc-900">
								{row.price}
							</td>

							<!-- Total Stock -->
							<td class="{ADMIN_TABLE.cell} text-right">
								<span
									class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border {row.totalStock === 0
										? ADMIN_BADGES.danger
										: row.totalStock <= 5
											? ADMIN_BADGES.warning
											: 'bg-zinc-50 text-zinc-700 border-zinc-200'}"
								>
									{row.totalStock} 件
								</span>
							</td>

							<!-- Variant Matrix Quick Preview -->
							<td class="{ADMIN_TABLE.cell} text-center">
								<button
									type="button"
									onclick={() => (inspectProduct = row)}
									class={ADMIN_BUTTONS.secondarySm}
									title="点击查看所有变体尺码与 SKU 详情"
								>
									<UiIcon icon={Layers} size={12} class="text-zinc-500" />
									<span>{row.variantCount} 个规格</span>
								</button>
							</td>

							<!-- Categories -->
							<td class="{ADMIN_TABLE.cell} text-center">
								{#if row.categories && row.categories.length > 0}
									<div class="flex flex-wrap justify-center gap-1 max-w-[160px] mx-auto">
										{#each row.categories as cat (cat.id)}
											<span class="inline-block px-2 py-0.5 rounded-card bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200/60">
												{cat.name}
											</span>
										{/each}
									</div>
								{:else}
									<span class="text-zinc-400 text-[11px]">未分类</span>
								{/if}
							</td>

							<!-- Storefront Active Switch -->
							<td class="{ADMIN_TABLE.cell} text-center">
								<button
									type="button"
									role="switch"
									aria-checked={row.isActive}
									aria-label="切换{row.title}上架状态"
									disabled={pendingIds.has(row.id)}
									onclick={() => toggleActive(row.id, !row.isActive)}
									class="relative inline-flex w-10 h-6 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed {row.isActive
										? 'bg-emerald-500'
										: 'bg-zinc-300'} disabled:opacity-50"
								>
									<span
										class="inline-block w-4 h-4 rounded-full bg-white transition-transform shadow-xs {row.isActive
											? 'translate-x-5'
											: 'translate-x-1'}"
									></span>
								</button>
							</td>

							<!-- Quick Actions -->
							<td class="{ADMIN_TABLE.cell} text-right">
								<div class="inline-flex items-center gap-1.5">
									<!-- View on storefront -->
									<a
										href="/shop/{row.slug}"
										target="_blank"
										rel="noopener noreferrer"
										class={ADMIN_BUTTONS.icon}
										title="在新标签页查看前台商品详情"
									>
										<UiIcon icon={ExternalLink} size={14} />
									</a>

									<!-- Edit details -->
									<a
										href="/admin/products/{row.id}"
										class={ADMIN_BUTTONS.secondarySm}
									>
										编辑
									</a>
								</div>
							</td>
						</tr>
					{/each}

					{#if visibleRows.length === 0}
						<tr>
							<td colspan="7" class="px-5 py-16 text-center text-sm text-zinc-400">
								<UiIcon icon={SearchX} size={36} class="text-zinc-300 block mb-2.5 mx-auto" />
								<p class="font-medium">未找到匹配的商品款目</p>
								<p class="text-xs text-zinc-400 mt-1">请尝试放宽搜索条件或重置筛选器</p>
								{#if hasActiveControls}
									<button
										type="button"
										onclick={resetAll}
										class="mt-3 text-xs text-zinc-900 underline font-medium hover:text-zinc-600 transition-colors cursor-pointer"
									>
										清空搜索与筛选条件
									</button>
								{/if}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
</div>

<!-- Variant Quick-Inspection Drawer -->
{#if inspectProduct}
	<div
		class={ADMIN_DRAWER.backdrop}
		role="dialog"
		aria-modal="true"
	>
		<div class={ADMIN_DRAWER.panel}>
			<!-- Drawer Header -->
			<div class={ADMIN_DRAWER.header}>
				<div>
					<div class="flex items-center gap-2">
						<h2 class="text-sm font-bold uppercase tracking-wider text-zinc-900">
							{inspectProduct.title}
						</h2>
						<span class={ADMIN_BADGES.neutral}>规格明细</span>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (inspectProduct = null)}
					class="p-1.5 rounded-card text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 cursor-pointer"
					aria-label="关闭抽屉"
				>
					<UiIcon icon={X} size={18} />
				</button>
			</div>

			<!-- Drawer Body: Variant List Table -->
			<div class={ADMIN_DRAWER.body}>
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold uppercase tracking-wider text-zinc-700">
						全部变体规格 ({inspectProduct.variants?.length || 0})
					</span>
					<span class="text-xs font-mono font-semibold text-zinc-500">
						总库存: {inspectProduct.totalStock} 件
					</span>
				</div>

				{#if !inspectProduct.variants || inspectProduct.variants.length === 0}
					<div class="p-8 bg-zinc-50 rounded-xl border border-zinc-200 text-center text-zinc-400 text-xs">
						暂无独立规格记录（单品模式）
					</div>
				{:else}
					<div class="border border-zinc-200 rounded-xl overflow-hidden">
						<table class="w-full text-left text-xs border-collapse">
							<thead class="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[10px] uppercase font-semibold">
								<tr>
									<th class="py-2.5 px-3">颜色</th>
									<th class="py-2.5 px-3">尺码</th>
									<th class="py-2.5 px-3">SKU 货号</th>
									<th class="py-2.5 px-3 text-right">可用库存</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-100 font-mono">
								{#each inspectProduct.variants as v (v.sku || `${v.color}-${v.size}`)}
									<tr class="hover:bg-zinc-50/50">
										<td class="py-2.5 px-3 font-sans font-medium text-zinc-900">
											{v.color || '默认'}
										</td>
										<td class="py-2.5 px-3 text-zinc-700">
											{v.size || '均码'}
										</td>
										<td class="py-2.5 px-3 text-zinc-500">
											{v.sku || '未指定'}
										</td>
										<td class="py-2.5 px-3 text-right font-bold {v.stockQuantity === 0
											? 'text-rose-600'
											: v.stockQuantity <= 5
												? 'text-amber-600'
												: 'text-zinc-900'}">
											{v.stockQuantity} 件
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<!-- Drawer Footer -->
			<div class={ADMIN_DRAWER.footer}>
				<button
					type="button"
					onclick={() => (inspectProduct = null)}
					class="px-4 py-2 rounded-card text-xs font-semibold text-zinc-600 hover:bg-zinc-200/60 cursor-pointer"
				>
					关闭
				</button>
				<a
					href="/admin/products/{inspectProduct.id}"
					class={ADMIN_BUTTONS.primary}
				>
					进入完整编辑
				</a>
			</div>
		</div>
	</div>
{/if}

<!-- Category Management Modal Dialog -->
{#if categoryModalOpen}
	<div
		class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
		role="dialog"
		aria-modal="true"
		aria-label="分类管理"
	>
		<!-- Backdrop click to close -->
		<button
			type="button"
			aria-label="关闭弹窗"
			class="absolute inset-0 bg-transparent cursor-default border-none w-full h-full"
			onclick={() => (categoryModalOpen = false)}
		></button>

		<div class="relative bg-white rounded-card shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-card bg-zinc-900 text-white flex items-center justify-center shadow-xs">
						<UiIcon icon={Tags} size={16} />
					</div>
					<div>
						<h2 class="text-sm font-bold uppercase tracking-wider text-zinc-900">
							分类管理
						</h2>
						<p class="text-[11px] text-zinc-500">
							管理目录结构、排序权重与前台分类可见性
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					{#if !showCategoryForm}
						<button
							type="button"
							onclick={openNewCategory}
							class={ADMIN_BUTTONS.primarySm}
						>
							<UiIcon icon={Plus} size={14} />
							<span>新建分类</span>
						</button>
					{/if}
					<button
						type="button"
						onclick={() => (categoryModalOpen = false)}
						class={ADMIN_BUTTONS.icon}
						aria-label="关闭"
					>
						<UiIcon icon={X} size={18} />
					</button>
				</div>
			</div>

			<!-- Modal Body -->
			<div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-zinc-700">
				{#if categoryModalError}
					<div
						role="alert"
						class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-card text-xs font-medium"
					>
						<UiIcon icon={CircleAlert} size={15} class="shrink-0" />
						<span>{categoryModalError}</span>
					</div>
				{/if}

				<!-- Inline Create / Edit Subform -->
				{#if showCategoryForm}
					<div class="p-4 rounded-card bg-zinc-50 border border-zinc-200 space-y-3.5">
						<div class="flex items-center justify-between pb-2 border-b border-zinc-200">
							<span class="text-xs font-bold uppercase tracking-wider text-zinc-900">
								{categoryEditingId ? '编辑分类' : '新建分类'}
							</span>
							<button
								type="button"
								onclick={() => (showCategoryForm = false)}
								class="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer"
							>
								取消
							</button>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<label class="block space-y-1">
								<span class="text-[11px] font-semibold text-zinc-700">分类名称 *</span>
								<input
									type="text"
									bind:value={categoryForm.name}
									placeholder="例如：男装系列"
									class="w-full bg-white border border-zinc-300 rounded-card px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-900"
								/>
							</label>

							<label class="block space-y-1">
								<span class="text-[11px] font-semibold text-zinc-700">排序权重 (越小越靠前)</span>
								<input
									type="number"
									min="0"
									bind:value={categoryForm.sort_order}
									class="w-full bg-white border border-zinc-300 rounded-card px-3 py-1.5 text-xs font-mono text-zinc-900 outline-none focus:border-zinc-900"
								/>
							</label>
						</div>

						<label class="block space-y-1">
							<span class="text-[11px] font-semibold text-zinc-700">URL 路径标识 (Slug, 留空将自动生成)</span>
							<input
								type="text"
								bind:value={categoryForm.slug}
								placeholder="例如：mens-wear"
								class="w-full bg-white border border-zinc-300 rounded-card px-3 py-1.5 text-xs font-mono text-zinc-900 outline-none focus:border-zinc-900"
							/>
						</label>

						<label class="block space-y-1">
							<span class="text-[11px] font-semibold text-zinc-700">分类描述 (可选)</span>
							<textarea
								bind:value={categoryForm.description}
								rows="2"
								placeholder="简要描述该分类定位..."
								class="w-full bg-white border border-zinc-300 rounded-card px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 resize-none"
							></textarea>
						</label>

						<div class="flex items-center justify-between pt-1">
							<label class="flex items-center gap-2 cursor-pointer select-none">
								<input
									type="checkbox"
									bind:checked={categoryForm.is_visible}
									class="w-4 h-4 accent-zinc-900 rounded"
								/>
								<span class="text-xs font-medium text-zinc-700">允许前台展示</span>
							</label>

							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => (showCategoryForm = false)}
									class={ADMIN_BUTTONS.secondary}
								>
									取消
								</button>
								<button
									type="button"
									onclick={saveCategory}
									disabled={categorySaving || !categoryForm.name.trim()}
									class={ADMIN_BUTTONS.primary}
								>
									{#if categorySaving}
										<span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
										<span>保存中...</span>
									{:else}
										<span>保存分类</span>
									{/if}
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Categories Table -->
				<div class="border border-zinc-200 rounded-card overflow-hidden">
					{#if categoryLoading && categories.length === 0}
						<div class="py-12 text-center text-zinc-400">
							<span class="inline-block w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mb-2"></span>
							<p class="text-xs">加载分类列表中...</p>
						</div>
					{:else if categories.length === 0}
						<div class="py-12 text-center text-zinc-400 space-y-2">
							<p class="text-xs">暂无任何商品分类</p>
							<p class="text-[11px] text-zinc-400">点击上方「新建分类」即可添加首个分类</p>
						</div>
					{:else}
						<table class="w-full text-left text-xs border-collapse">
							<thead class="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[10px] uppercase font-semibold">
								<tr>
									<th class="py-2.5 px-3 w-14 text-center">排序</th>
									<th class="py-2.5 px-3">分类名称</th>
									<th class="py-2.5 px-3">标识 Slug</th>
									<th class="py-2.5 px-3 text-center">关联商品</th>
									<th class="py-2.5 px-3 text-center">前台状态</th>
									<th class="py-2.5 px-3 text-right">操作</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-100">
								{#each categories.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) as cat (cat.id)}
									<tr class="hover:bg-zinc-50/60 transition-colors">
										<td class="py-2.5 px-3 font-mono text-zinc-400 text-center text-[11px]">
											{cat.sortOrder ?? 0}
										</td>
										<td class="py-2.5 px-3 font-semibold text-zinc-900">
											{cat.name}
										</td>
										<td class="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">
											/{cat.slug}
										</td>
										<td class="py-2.5 px-3 text-center">
											<span class="inline-block px-2 py-0.5 rounded-card bg-zinc-100 text-zinc-700 font-mono text-[11px] font-medium">
												{cat.productCount ?? 0} 款
											</span>
										</td>
										<td class="py-2.5 px-3 text-center">
											<button
												type="button"
												onclick={() => toggleCategoryVisibility(cat)}
												title={cat.isActive !== false ? '点击隐藏分类' : '点击显示分类'}
												class="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border text-[11px] transition-colors cursor-pointer {cat.isActive !== false
													? 'bg-emerald-50 text-emerald-700 border-emerald-200'
													: 'bg-zinc-100 text-zinc-500 border-zinc-200'}"
											>
												<UiIcon icon={cat.isActive !== false ? Eye : EyeOff} size={12} />
												<span>{cat.isActive !== false ? '显示' : '隐藏'}</span>
											</button>
										</td>
										<td class="py-2.5 px-3 text-right">
											<div class="flex items-center justify-end gap-1">
												<button
													type="button"
													onclick={() => openEditCategory(cat)}
													title="编辑分类"
													aria-label="编辑{cat.name}"
													class={ADMIN_BUTTONS.icon}
												>
													<UiIcon icon={Pencil} size={13} />
												</button>
												<button
													type="button"
													onclick={() => deleteCategory(cat)}
													title="删除分类"
													aria-label="删除{cat.name}"
													class={ADMIN_BUTTONS.danger}
												>
													<UiIcon icon={Trash2} size={13} />
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
				<span class="text-[11px] text-zinc-400 font-medium">
					共 <strong class="font-mono text-zinc-700">{categories.length}</strong> 个分类 · 修改将即时同步至筛选栏
				</span>
				<button
					type="button"
					onclick={() => (categoryModalOpen = false)}
					class={ADMIN_BUTTONS.secondary}
				>
					关闭
				</button>
			</div>
		</div>
	</div>
{/if}
