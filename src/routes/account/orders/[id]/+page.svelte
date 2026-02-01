<script lang="ts">
	import type { PageData } from './$types';
	import OrderSummary from '$lib/components/orders/OrderSummary.svelte';
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';
	import { ArrowLeft } from 'lucide-svelte';

	let { data } = $props<{ data: PageData }>();

	// Formatters
	let currencyFormatter = $derived(
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: data.order.currency
		})
	);
</script>

<div class="max-w-4xl mx-auto px-6 py-12">
	<a
		href="/account/orders"
		class="inline-flex items-center text-sm font-sans font-medium text-neutral-500 hover:text-black dark:hover:text-white mb-8 transition-colors"
	>
		<ArrowLeft size={16} class="mr-2" />
		Back to Orders
	</a>

	<!-- Header & Summary -->
	<OrderSummary order={data.order} />

	<!-- Items List -->
	<div class="space-y-6">
		<h2 class="font-display text-xl text-text-main dark:text-white">Items</h2>
		<div class="border-t border-neutral-200 dark:border-neutral-800">
			{#each data.order.items as item (item.id)}
				<div
					class="py-6 flex gap-6 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
				>
					<!-- Image -->
					<div
						class="w-20 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden shrink-0"
					>
						{#if item.image}
							<RemoteImage
								src={item.image}
								alt={item.title}
								className="w-full h-full object-cover"
							/>
						{:else}
							<div class="w-full h-full flex items-center justify-center text-neutral-300">
								No Img
							</div>
						{/if}
					</div>

					<!-- Details -->
					<div class="flex-1 min-w-0">
						<div class="flex justify-between items-start gap-4">
							<div>
								<h3 class="font-sans font-medium text-text-main dark:text-white line-clamp-2">
									{item.title}
								</h3>
								{#if item.variant}
									<p class="text-sm text-neutral-500 mt-1">{item.variant}</p>
								{/if}
								<p class="text-sm text-neutral-500 mt-1">Qty: {item.quantity}</p>
							</div>
							<p class="font-sans font-medium text-text-main dark:text-white">
								{currencyFormatter.format((item.price * item.quantity) / 100)}
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Totals -->
		<div class="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-lg mt-6">
			<div class="flex justify-between items-center py-2">
				<span class="text-sm text-neutral-500">Subtotal</span>
				<span class="text-sm font-medium">{currencyFormatter.format(data.order.total / 100)}</span>
			</div>
			<!-- Add shipping/tax here if available in data model -->
			<div
				class="flex justify-between items-center py-4 border-t border-neutral-200 dark:border-neutral-800 mt-2"
			>
				<span class="font-medium text-text-main dark:text-white">Total</span>
				<span class="font-display text-xl text-text-main dark:text-white">
					{currencyFormatter.format(data.order.total / 100)}
				</span>
			</div>
		</div>
	</div>
</div>
