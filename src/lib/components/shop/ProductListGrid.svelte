<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import LinkedImage from '$lib/components/ui/LinkedImage.svelte';
	import type { Product } from '$lib/types';

	interface Props {
		products: Product[];
		variant?: 'card' | 'image';
		gridClass?: string;
		cardWrapperClass?: string;
		hrefPrefix?: string;
		imageThumb?: string;
	}

	let {
		products,
		variant = 'card',
		gridClass = 'grid grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-4 md:gap-x-12',
		cardWrapperClass = 'group flex flex-col gap-4',
		hrefPrefix = '/shop/',
		imageThumb = '800x0'
	}: Props = $props();

	function getProductHref(id: string) {
		return `${hrefPrefix}${id}`;
	}
</script>

<div class={gridClass}>
	{#each products as product (product.id)}
		{#if variant === 'card'}
			{#if cardWrapperClass}
				<div class={cardWrapperClass}>
					<ProductCard {product} href={getProductHref(product.id)} />
				</div>
			{:else}
				<ProductCard {product} href={getProductHref(product.id)} />
			{/if}
		{:else}
			<LinkedImage
				href={getProductHref(product.id)}
				src={product.image || ''}
				alt={product.title}
				linkClass="block"
				frameClass="aspect-[3/4] w-full overflow-hidden bg-neutral-100 dark:bg-[#2a2a2a]"
				imageClassName="w-full h-full object-cover"
				thumb={imageThumb}
			/>
		{/if}
	{/each}
</div>
