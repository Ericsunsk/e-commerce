<script lang="ts">
	import { ProductListGridConnected as ProductListGrid } from '$domains/catalog';
	import { RemoteImage } from '$shared/ui';
	import { resolveSplitShowcase } from '$domains/content';

	let { data } = $props();

	let splitSection = $derived(
		data.sections?.find((s) => s.type === 'split_showcase') || data.sections?.[0]
	);

	let showcase = $derived(resolveSplitShowcase(splitSection));

	// 滚动交互逻辑 (Single Element Hybrid)
	let scrollY = $state(0);
	let innerHeight = $state(0);

	// 归位条件：scrollY + 0.5ih >= 1.1375ih => scrollY >= 0.6375ih
	let isLanded = $derived(scrollY >= innerHeight * 0.6375);
</script>

<svelte:window bind:scrollY bind:innerHeight />

<svelte:head>
	<title>{data.page?.title || showcase.heading} | {data.settings.siteName}</title>
</svelte:head>

<div class="relative w-full min-h-screen bg-background-light dark:bg-background-dark">
	<!-- BRANDING LAYER: 单一元素，通过 class 切换定位模式 -->
	<div
		class="left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 text-center will-change-transform backface-hidden {isLanded
			? 'absolute top-[calc(100vh+13.75vh)]'
			: 'fixed top-1/2'}"
	>
		<h1
			class="font-display text-[12vw] md:text-[14vw] font-bold tracking-[0.05em] leading-none text-red-600 select-none whitespace-nowrap"
		>
			{showcase.heading}
		</h1>
	</div>

	<!-- HERO SECTION: Split Screen -->
	<div class="relative w-full h-screen flex flex-col md:flex-row z-0">
		{#each showcase.panels as panel (panel.id)}
			{#if panel.link}
				<a href={panel.link} class="flex-1 block bg-background-light dark:bg-primary overflow-hidden">
					<RemoteImage
						src={panel.image}
						alt={panel.title}
						className="w-full h-full"
						priority={true}
						thumb="2000x0"
					/>
				</a>
			{:else}
				<div class="flex-1 bg-background-light dark:bg-primary overflow-hidden">
					<RemoteImage
						src={panel.image}
						alt={panel.title}
						className="w-full h-full"
						priority={true}
						thumb="2000x0"
					/>
				</div>
			{/if}
		{/each}
	</div>

	<!-- PRODUCT GRID SECTION -->
	<div
		class="relative z-20 pt-[27.5vh] pb-12 px-4 md:px-6 bg-background-light dark:bg-background-dark"
	>
		{#if showcase.subheading}
			<div class="mb-[calc(3rem+2.5vh)] text-center">
				<span class="text-[20px] font-medium tracking-[0.1em] uppercase text-primary dark:text-white"
					>{showcase.subheading}</span
				>
			</div>
		{/if}

		<ProductListGrid
			products={data.products}
			variant="image"
			gridClass="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-x-8 md:gap-y-12"
		/>
	</div>
</div>
