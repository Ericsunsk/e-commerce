<script lang="ts">
	/**
	 * ProductGridSkeleton - Loading placeholder for product grids
	 * Displays multiple ProductCardSkeleton in a grid layout
	 */
	import ProductCardSkeleton from './ProductCardSkeleton.svelte';

	interface Props {
		count?: number;
		columns?: 2 | 3 | 4;
	}

	let { count = 6, columns = 3 }: Props = $props();

	const items = $derived(Array.from({ length: count }, (_, i) => i));

	const gridClass = {
		2: 'grid-cols-1 sm:grid-cols-2',
		3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
		4: 'grid-cols-2 md:grid-cols-4'
	};
</script>

<div class="grid {gridClass[columns]} gap-y-16 gap-x-6 md:gap-x-12">
	{#each items as i (i)}
		<ProductCardSkeleton />
	{/each}
</div>
