<script lang="ts">
	import LinkedImage from '$lib/components/ui/LinkedImage.svelte';
	import { TRANSITIONS } from '$lib/constants';
	import type { UIAsset } from '$lib/types';

	interface Props {
		assets?: UIAsset[];
	}

	let { assets = [] }: Props = $props();

	// 从 assets 中查找对应的图片 URL
	function getImageUrl(key: string): string {
		const asset = assets.find((a) => a.key === key);
		return asset?.url || '';
	}

	// 首页三大入口配置
	let categories = $derived([
		{
			name: 'MENS',
			link: '/shop?gender=mens',
			image: getImageUrl('hero_category_mens')
		},
		{
			name: 'WOMENS',
			link: '/shop?gender=womens',
			image: getImageUrl('hero_category_womens')
		},
		{
			name: 'ACCESSORIES',
			link: '/shop?category=accessories',
			image: getImageUrl('hero_category_accessories')
		}
	]);
</script>

<section class="py-8 px-6 md:px-12">
	<div class="max-w-[1600px] mx-auto">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
			{#each categories as category (category.name)}
				<LinkedImage
					href={category.link}
					preloadData="hover"
					linkClass="group relative aspect-[4/5] md:aspect-[3/4] overflow-hidden"
					frameClass="w-full h-full"
					src={category.image}
					alt={category.name}
					imageClassName="w-full h-full object-cover {TRANSITIONS.transform} group-hover:scale-105"
					overlayClassName="absolute inset-0 bg-black/10 group-hover:bg-black/20 {TRANSITIONS.colors}"
				>
					<!-- Content - Bottom Left -->
					<div class="absolute bottom-8 left-8 flex flex-col gap-2">
						<h3
							class="text-white text-xl md:text-2xl font-sans font-bold tracking-[0.15em] uppercase"
						>
							{category.name}
						</h3>
					</div>
				</LinkedImage>
			{/each}
		</div>
	</div>
</section>
