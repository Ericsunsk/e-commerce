<script lang="ts">
	import type { PageData } from './$types';
	import OrderCard from '$lib/components/orders/OrderCard.svelte';
	import { ShoppingBag, ArrowRight } from 'lucide-svelte';

	let { data } = $props<{ data: PageData }>();
</script>

<div class="max-w-4xl mx-auto px-6 py-12">
	<h1 class="font-display text-3xl md:text-4xl text-text-main dark:text-white mb-8">
		Order History
	</h1>

	{#if data.orders.length > 0}
		<div class="grid grid-cols-1 gap-4">
			{#each data.orders as order (order.id)}
				<OrderCard {order} />
			{/each}
		</div>
	{:else}
		<!-- Empty State -->
		<div
			class="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-900/50"
		>
			<div
				class="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6"
			>
				<ShoppingBag size={32} class="text-neutral-400" />
			</div>
			<h2 class="font-display text-xl text-text-main dark:text-white mb-2">No orders yet</h2>
			<p class="text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm mx-auto">
				Looks like you haven't placed any orders yet. Start shopping to discover our premium
				collection.
			</p>
			<a
				href="/shop"
				class="inline-flex items-center justify-center px-8 py-3 bg-black text-white dark:bg-white dark:text-black font-sans text-xs font-medium tracking-widest uppercase hover:opacity-80 transition-opacity"
			>
				Start Shopping
				<ArrowRight size={16} class="ml-2" />
			</a>
		</div>
	{/if}
</div>
