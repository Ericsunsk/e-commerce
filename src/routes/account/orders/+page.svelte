<script lang="ts">
	import type { PageData } from './$types';
	import OrderCard from '$lib/components/orders/OrderCard.svelte';
	import { ShoppingBag, ArrowLeft } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Order History | Account</title>
</svelte:head>

<div class="min-h-screen bg-background-light dark:bg-background-dark pt-[80px] pb-20 px-6 md:px-12">
	<div class="max-w-5xl mx-auto">
		<!-- Header Navigation -->
		<div
			class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
			in:fade={{ duration: 500 }}
		>
			<div>
				<a
					href="/account"
					class="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-text-main dark:text-neutral-500 dark:hover:text-white transition-colors mb-6"
				>
					<ArrowLeft size={12} class="mr-2" />
					Back to Dashboard
				</a>
				<h1
					class="font-display text-4xl md:text-5xl font-medium text-text-main dark:text-white uppercase tracking-[0.05em]"
				>
					Order History
				</h1>
			</div>

			<div
				class="font-sans text-xs font-medium text-text-muted dark:text-neutral-500 uppercase tracking-widest"
			>
				{data.orders.length}
				{data.orders.length === 1 ? 'Order' : 'Orders'}
			</div>
		</div>

		<!-- Content -->
		{#if data.orders.length > 0}
			<div
				class="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800"
			>
				{#each data.orders as order, i (order.id)}
					<div
						in:fly={{ y: 20, duration: 500, delay: Math.min(i * 50, 300) }}
						class="bg-background-light dark:bg-background-dark"
					>
						<OrderCard {order} />
					</div>
				{/each}
			</div>
		{:else}
			<!-- Empty State -->
			<div
				class="py-32 flex flex-col items-center justify-center text-center border border-dashed border-neutral-300 dark:border-neutral-800"
				in:fade
			>
				<div
					class="w-20 h-20 mb-8 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center"
				>
					<ShoppingBag size={24} class="text-neutral-400" />
				</div>
				<h2
					class="font-display text-2xl text-text-main dark:text-white uppercase tracking-wide mb-4"
				>
					No orders yet
				</h2>
				<p class="text-neutral-500 font-sans text-sm mb-10 max-w-sm leading-relaxed">
					Your collection is currently empty. Explore our latest arrivals to begin your journey.
				</p>
				<a
					href="/shop"
					class="inline-flex items-center justify-center px-10 py-4 bg-primary text-white dark:bg-white dark:text-primary font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
				>
					Start Shopping
				</a>
			</div>
		{/if}
	</div>
</div>
