<script lang="ts">
	import ProductListGrid from '$lib/components/shop/ProductListGrid.svelte';
	import type { Product, UISection } from '$lib/types';

	interface Props {
		section: UISection;
		products: Product[];
	}

	let { section, products = [] }: Props = $props();
</script>

<section class="py-24 px-6 md:px-12 bg-background-light dark:bg-background-dark">
	<div class="max-w-[1600px] mx-auto">
		<div
			class="flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-0 mb-8 md:mb-12"
		>
			<div>
				{#if section.subheading}
					<span
						class="text-xs font-sans font-medium tracking-[0.2em] uppercase text-primary/60 dark:text-white/60 mb-2 block"
					>
						{section.subheading}
					</span>
				{/if}
				<h3
					class="text-2xl md:text-3xl font-display text-text-main dark:text-white uppercase tracking-wider"
				>
					{section.heading || 'Featured Products'}
				</h3>
			</div>
			{#if section.settings?.actions?.[0]}
				<a
					href={section.settings.actions[0].link}
					data-sveltekit-preload-data="hover"
					class="text-xs font-sans font-semibold uppercase tracking-widest text-primary dark:text-white hover:underline underline-offset-4 decoration-1 transition-all self-start md:self-auto"
				>
					{section.settings.actions[0].text || 'View All'}
				</a>
			{/if}
		</div>

		{#if products.length > 0}
			<ProductListGrid
				{products}
				variant="card"
				gridClass="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-8"
				cardWrapperClass=""
			/>
		{:else}
			<div class="text-center py-16 text-primary/50 dark:text-white/50">
				<p class="text-sm">No products to display</p>
			</div>
		{/if}
	</div>
</section>
