<script lang="ts">
	import ProductListGrid from '$lib/components/shop/ProductListGrid.svelte';
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';
	import { getFileUrl } from '$lib/utils/image';

	let { data } = $props();

	type PBRecord = {
		position: string;
		image: string;
		collectionId: string;
		id: string;
		link?: string;
		title?: string;
	};

	// 优先使用 collection_images 集合中的图片
	let leftRecord = $derived(
		data.collectionImages?.find((img: PBRecord) => img.position === 'left')
	);
	let rightRecord = $derived(
		data.collectionImages?.find((img: PBRecord) => img.position === 'right')
	);

	// 辅助函数：构建图片 URL（支持 PB 直连或 R2 CDN）
	const getImageUrl = (record: PBRecord | undefined) => {
		if (!record || !record.image) return '';
		return getFileUrl(record.collectionId, record.id, record.image);
	};

	let heroImageLeft = $derived(getImageUrl(leftRecord));
	let heroImageRight = $derived(getImageUrl(rightRecord));

	// 动态获取链接和标题
	let leftLink = $derived(leftRecord?.link || '/shop?gender=womens');
	let rightLink = $derived(rightRecord?.link || '/shop?gender=mens');
	let leftTitle = $derived(leftRecord?.title || 'Shop Woman > New Arrivals');
	let rightTitle = $derived(rightRecord?.title || 'Shop Man');
	let heroPanels = $derived([
		{
			id: 'left',
			link: leftLink,
			title: leftTitle,
			image: heroImageLeft
		},
		{
			id: 'right',
			link: rightLink,
			title: rightTitle,
			image: heroImageRight
		}
	]);

	// 滚动交互逻辑 (Single Element Hybrid)
	let scrollY = $state(0);
	let innerHeight = $state(0);

	// 归位条件：scrollY + 0.5ih >= 1.1375ih => scrollY >= 0.6375ih
	let isLanded = $derived(scrollY >= innerHeight * 0.6375);
</script>

<svelte:window bind:scrollY bind:innerHeight />

<svelte:head>
	<title>Collections | {data.settings.siteName}</title>
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
			ELEMENTHIC
		</h1>
	</div>

	<!-- HERO SECTION: Split Screen -->
	<div class="relative w-full h-screen flex flex-col md:flex-row z-0">
		{#each heroPanels as panel (panel.id)}
			<a href={panel.link} class="flex-1 block bg-background-light dark:bg-primary overflow-hidden">
				{#if panel.image}
					<RemoteImage
						src={panel.image}
						alt={panel.title}
						className="w-full h-full"
						priority={true}
						thumb="2000x0"
					/>
				{/if}
			</a>
		{/each}
	</div>

	<!-- PRODUCT GRID SECTION -->
	<div
		class="relative z-20 pt-[27.5vh] pb-12 px-4 md:px-6 bg-background-light dark:bg-background-dark"
	>
		<div class="mb-[calc(3rem+2.5vh)] text-center">
			<span class="text-[20px] font-medium tracking-[0.1em] uppercase text-primary dark:text-white"
				>Shop Now</span
			>
		</div>

		<ProductListGrid
			products={data.products}
			variant="image"
			gridClass="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-x-8 md:gap-y-12"
		/>
	</div>
</div>
