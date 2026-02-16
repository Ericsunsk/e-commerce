<script lang="ts">
	import ProductListGrid from '$lib/components/shop/ProductListGrid.svelte';
	import ProductGridSkeleton from '$lib/components/ui/ProductGridSkeleton.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { parsePrice } from '$lib/utils/price';
	import SectionRenderer from '$lib/components/SectionRenderer.svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// 动态过滤：排除已在顶级导航中出现的 category（如 ACCESSORIES）
	// 这样当您在 PocketBase 导航中添加新的 category 链接时，子选项会自动排除
	const categories = $derived([
		{ name: 'ALL', slug: 'ALL' },
		...data.categories
			.filter((c) => !data.navCategorySlugs.includes(c.slug))
			.map((c) => ({
				name: c.name ? c.name.toUpperCase() : 'UNKNOWN',
				slug: c.slug
			}))
	]);

	let activeCategory = $derived($page.url.searchParams.get('category') || 'ALL');
	let activeSearch = $derived($page.url.searchParams.get('search') || '');
	let activeSort = $state('Featured');
	let isFilterOpen = $state(false);

	// 判断当前是否从顶级导航 category 入口进入（如 accessories）
	// 如果是，则隐藏子选项栏
	let isNavLevelCategory = $derived(() => {
		const currentCategory = $page.url.searchParams.get('category');
		return currentCategory && data.navCategorySlugs.includes(currentCategory);
	});

	// 是否显示子选项筛选栏
	let showCategoryFilter = $derived($page.url.searchParams.has('gender') && !isNavLevelCategory());

	function selectCategory(slug: string) {
		const url = new URL($page.url);
		if (slug === 'ALL') {
			url.searchParams.delete('category');
		} else {
			url.searchParams.set('category', slug);
		}
		goto(url.toString(), { replaceState: false, noScroll: true });
	}

	type FilterState = {
		PILLAR: string[];
		'PRODUCT TYPE': string[];
		SIZES: string[];
		COLOR: string[];
		[key: string]: string[]; // Add index signature to allow string indexing
	};

	let selectedFilters = $state<FilterState>({
		PILLAR: [],
		'PRODUCT TYPE': [],
		SIZES: [],
		COLOR: []
	});

	// Mock Data based on image
	const filterGroups = {
		PILLAR: ['FEAR OF GOD', 'ESSENTIALS', 'ATHLETICS'],
		'PRODUCT TYPE': [
			'HOODIES',
			'TEES',
			'SWEATPANTS',
			'OUTERWEAR',
			'HATS',
			'CREWNECK',
			'SWEATSHIRTS',
			'PANTS',
			'JACKETS',
			'SHORTS',
			'COATS'
		],
		SIZES: ['XXS', 'S', 'L', 'XXL', 'XXXL', 'XS', 'M', 'XL', 'O/S'],
		COLOR: [
			'BLACK',
			'BLUE',
			'BROWN',
			'CREAM',
			'DARK SAPPHIRE',
			'DK BLUE',
			'GREEN',
			'GREY',
			'MED BLUE',
			'RED',
			'SPORTS',
			'WHITE',
			'YELLOW',
			'YELLOW'
		]
	};

	function toggleFilterOption(group: string, option: string) {
		const current = selectedFilters[group];
		if (current.includes(option)) {
			selectedFilters[group] = current.filter((item) => item !== option);
		} else {
			selectedFilters[group] = [...current, option];
		}
	}

	function clearFilters() {
		selectedFilters = {
			PILLAR: [],
			'PRODUCT TYPE': [],
			SIZES: [],
			COLOR: []
		};
	}

	let filteredProducts = $derived.by(() => {
		let items = data.products;

		// 0. Filter by Search
		if (activeSearch) {
			const q = activeSearch.toUpperCase();
			items = items.filter((p) => p.title.toUpperCase().includes(q));
		}

		// 1. Filter by Category - REMOVED
		// Backend handles category filtering based on URL param.
		// We trust data.products contains what we want.

		// 2. Filter by Size (Mock Logic - in real app, check product.variants)
		// Since we don't have real variant data, we'll just mock it by saying all products have all sizes for now,
		// OR we just ignore it to prevent empty results, demonstrating the UI interaction.
		// Let's assume if any size is selected, we filter nothing just to show UI state persists.

		// 3. Sort
		return [...items].sort((a, b) => {
			const priceA = parsePrice(a.price);
			const priceB = parsePrice(b.price);

			switch (activeSort) {
				case 'Price: Low to High':
					return priceA - priceB;
				case 'Price: High to Low':
					return priceB - priceA;
				case 'Newest':
					return parseInt(b.id) - parseInt(a.id); // Mock newness by ID
				default:
					return 0; // Featured (original order)
			}
		});
	});

	// Unified Title Logic: Trust the page record title from CMS
	const unifiedTitle = $derived(activeSearch ? 'SEARCH RESULTS' : data.page?.title || 'COLLECTION');

	// Pagination Logic
	let visibleCount = $state(6);

	// Reset visible count when filters change
	$effect(() => {
		// Track dependencies
		void activeCategory;
		void activeSearch;
		void activeSort;
		// Reset
		visibleCount = 6;
	});

	let displayProducts = $derived(filteredProducts.slice(0, visibleCount));

	function loadMore() {
		visibleCount += 6;
	}
</script>

<svelte:head>
	<title>{data.page?.title || 'Shop'} | {data.settings.siteName}</title>
	<meta
		name="description"
		content={data.page?.metaDescription ||
			'Explore our curated collection of luxury fashion essentials.'}
	/>
</svelte:head>

<!-- Dynamic CMS Sections (e.g., Hero Banner) -->
{#if data.sections && data.sections.length > 0}
	<div class="w-full">
		{#each data.sections as section (section.id)}
			<SectionRenderer {section} />
		{/each}
	</div>
{/if}

<div
	class="flex flex-col items-center w-full px-4 md:px-12 py-12 {data.sections?.length
		? ''
		: 'pt-32'}"
>
	<div class="w-full max-w-[1440px] flex flex-col gap-16">
		<!-- Page Heading & Filters -->
		<section class="flex flex-col gap-8 items-center text-center">
			<h2
				class="text-3xl md:text-5xl font-display font-medium tracking-[0.05em] uppercase leading-tight text-primary dark:text-white mb-4"
			>
				{unifiedTitle}
			</h2>

			<!-- Filter Bar: Only show on GENDER filtered pages (Mens, Womens) -->
			<!-- 如果当前 category 是顶级导航中定义的（如 accessories），则隐藏子选项栏 -->
			{#if showCategoryFilter}
				<div class="relative w-full" in:fade>
					<div
						class="w-full py-4 flex flex-col md:flex-row justify-between items-center gap-4 mt-8"
					>
						<div
							class="hidden md:flex gap-8 overflow-x-auto w-full md:w-auto justify-center md:justify-start px-4 md:px-0 scrollbar-hide"
						>
							{#each categories as category (category.slug)}
								<button
									class="text-[10px] tracking-[0.1em] pb-1 border-b transition-all duration-300 text-primary dark:text-white {activeCategory ===
									category.slug
										? 'border-primary dark:border-white'
										: 'border-transparent hover:border-primary dark:hover:border-white'}"
									onclick={() => selectCategory(category.slug)}
								>
									{category.name}
								</button>
							{/each}
						</div>
						<div
							class="flex items-center text-[10px] tracking-[0.1em] text-primary dark:text-white px-4 md:px-0 ml-auto md:ml-0"
						>
							<button
								class="flex items-baseline gap-2 hover:opacity-60 transition-opacity font-bold"
								onclick={() => (isFilterOpen = true)}
							>
								FILTER
								<span class="text-[16px] font-light leading-none">+</span>
							</button>
						</div>
					</div>
				</div>
			{/if}
		</section>

		<!-- Product Grid -->
		<section
			class="grid grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-4 md:gap-x-12 relative min-h-[400px]"
		>
			{#if filteredProducts.length === 0}
				<div
					class="col-span-full flex flex-col items-center justify-center py-32 text-primary/40 dark:text-white/40 gap-6"
					in:fade
				>
					<span class="material-symbols-outlined text-4xl opacity-50">search_off</span>
					<p class="text-sm uppercase tracking-widest">No products found in this category</p>
				</div>
			{:else if data.products.length === 0}
				<div class="col-span-full">
					<ProductGridSkeleton count={8} columns={4} />
				</div>
			{:else}
				<div class="col-span-full" in:fade={{ duration: 300 }}>
					<ProductListGrid
						products={displayProducts}
						variant="card"
						gridClass="grid grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-4 md:gap-x-12"
						cardWrapperClass="group flex flex-col gap-4"
					/>
				</div>
			{/if}
		</section>

		<!-- Load More -->
		{#if filteredProducts.length > visibleCount}
			<div class="flex justify-center py-16" in:fade>
				<button
					onclick={loadMore}
					class="text-[10px] font-sans font-medium tracking-[0.15em] border-b border-primary dark:border-white pb-[3px] uppercase hover:opacity-60 transition-opacity"
				>
					View More Products
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Filter Sidebar -->
<!-- Filter Sidebar -->
<Drawer
	isOpen={isFilterOpen}
	onClose={() => (isFilterOpen = false)}
	title="Filter"
	width="w-full md:w-[410px]"
>
	<!-- Scrollable Content -->
	<div class="flex flex-col gap-10 pb-12">
		{#each Object.entries(filterGroups) as [groupName, options] (groupName)}
			<div class="space-y-6">
				<h4
					class="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/40 dark:text-white/40"
				>
					{groupName}
				</h4>
				<div class="grid grid-cols-2 gap-y-5 gap-x-4">
					{#each options as option (option)}
						<label class="flex items-center gap-3 cursor-pointer group">
							<div class="relative flex items-center">
								<input
									type="checkbox"
									class="peer appearance-none w-3 h-3 border border-primary dark:border-white checked:bg-primary dark:checked:bg-white transition-all rounded-[1px]"
									checked={selectedFilters[groupName].includes(option)}
									onchange={() => toggleFilterOption(groupName, option)}
								/>
							</div>
							<span
								class="text-[10px] font-bold tracking-[0.1em] uppercase transition-colors {selectedFilters[
									groupName
								].includes(option)
									? 'text-primary dark:text-white'
									: 'text-primary/40 dark:text-white/40 group-hover:text-primary dark:group-hover:text-white'}"
							>
								{option}
							</span>
						</label>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	{#snippet footer()}
		<div class="grid grid-cols-2 gap-4">
			<Button variant="outline" size="md" fullWidth onclick={clearFilters}>Clear</Button>
			<Button variant="solid" size="md" fullWidth onclick={() => (isFilterOpen = false)}>
				Apply
			</Button>
		</div>
	{/snippet}
</Drawer>
