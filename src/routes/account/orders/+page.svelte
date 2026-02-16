<script lang="ts">
	import type { PageData } from './$types';
	import AccountEmptyState from '$lib/components/account/AccountEmptyState.svelte';
	import OrderCard from '$lib/components/orders/OrderCard.svelte';
	import AccountPageShell from '$lib/components/account/AccountPageShell.svelte';
	import AccountBackLink from '$lib/components/account/AccountBackLink.svelte';
	import { ShoppingBag } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Order History | Account</title>
</svelte:head>

<AccountPageShell>
	<!-- Header Navigation -->
	<div
		class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
		in:fade={{ duration: 500 }}
	>
		<div>
			<AccountBackLink href="/account" label="Back to Dashboard" className="mb-6" />
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
		<div class="py-32 border border-dashed border-neutral-300 dark:border-neutral-800" in:fade>
			<AccountEmptyState
				title="No orders yet"
				description="Your collection is currently empty. Explore our latest arrivals to begin your journey."
				actionLabel="Start Shopping"
				actionHref="/shop"
				actionVariant="solid"
			>
				{#snippet icon()}
					<div
						class="w-20 h-20 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto"
					>
						<ShoppingBag size={24} class="text-neutral-400" />
					</div>
				{/snippet}
			</AccountEmptyState>
		</div>
	{/if}
</AccountPageShell>
