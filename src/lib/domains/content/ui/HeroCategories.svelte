<script lang="ts">
	import { LinkedImage, type Category } from '$domains/catalog';
	import { TRANSITIONS } from '$shared/kernel';
	import type { UISection, UIAsset } from '../domain/models';
	import { resolveCategoryGridItems, getCategoryGridClass } from '../domain/category-grid';

	interface Props {
		section?: UISection;
		categories?: Category[];
		assets?: UIAsset[];
	}

	let { section, categories = [], assets = [] }: Props = $props();

	let displayItems = $derived(resolveCategoryGridItems({ section, categories, assets }));
	let gridClass = $derived(getCategoryGridClass(displayItems.length));
</script>

<section class="py-8 px-6 md:px-12">
	<div class="max-w-[1600px] mx-auto">
		<div class="grid {gridClass} gap-6 md:gap-8">
			{#each displayItems as category (category.name + category.link)}
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
