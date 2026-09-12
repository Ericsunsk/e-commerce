<script lang="ts">
	import ProductCard from './ProductCard.svelte';
	import LinkedImage from './LinkedImage.svelte';
	import type { Product } from '../domain/models';

	interface Props {
		products: Product[];
		variant?: 'card' | 'image';
		gridClass?: string;
		cardWrapperClass?: string;
		hrefPrefix?: string;
		imageThumb?: string;
		/** Forwarded to ProductCard — see its Props for why these are injected. */
		onAddToBag?: (product: Product) => void;
		wishlist?: { has: (id: string) => boolean; toggle: (product: Product) => void };
		currencyCode?: string;
	}

	let {
		products,
		variant = 'card',
		gridClass = 'grid grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-4 md:gap-x-12',
		cardWrapperClass = 'group flex flex-col gap-4',
		hrefPrefix = '/shop/',
		imageThumb = '800x0',
		onAddToBag,
		wishlist,
		currencyCode
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
					<ProductCard
						{product}
						href={getProductHref(product.id)}
						{onAddToBag}
						{wishlist}
						{currencyCode}
					/>
				</div>
			{:else}
				<ProductCard
					{product}
					href={getProductHref(product.id)}
					{onAddToBag}
					{wishlist}
					{currencyCode}
				/>
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
