<script lang="ts">
	import type { OrderSummary } from '$lib/types';
	import { Package, ChevronRight } from 'lucide-svelte';

	let { order } = $props<{ order: OrderSummary }>();

	// Formatters
	let dateFormatter = $derived(
		new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium'
		})
	);

	let currencyFormatter = $derived(
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: order.currency
		})
	);

	// Status helpers
	function getStatusColor(status: string) {
		switch (status) {
			case 'paid':
			case 'delivered':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
			case 'shipped':
			case 'processing':
				return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
			case 'cancelled':
			case 'refunded':
				return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
			default:
				return 'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
		}
	}

	function getStatusLabel(status: string) {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<a
	href="/account/orders/{order.id}"
	data-sveltekit-preload-data="hover"
	class="group block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 transition-all duration-300 hover:border-black/20 dark:hover:border-white/20 hover:shadow-sm"
>
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<!-- Left: Icon & Main Info -->
		<div class="flex items-start gap-4">
			<div
				class="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0"
			>
				<Package size={20} class="text-neutral-500" />
			</div>

			<div>
				<div class="flex flex-wrap items-center gap-2 mb-1">
					<span class="font-display font-medium text-lg text-text-main dark:text-white">
						{currencyFormatter.format(order.total / 100)}
					</span>
					<span
						class="text-[10px] font-sans font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border {getStatusColor(
							order.status
						)}"
					>
						{getStatusLabel(order.status)}
					</span>
				</div>
				<div class="text-sm text-neutral-500 dark:text-neutral-400 font-sans">
					Placed on {dateFormatter.format(new Date(order.date))}
				</div>
				{#if order.firstItemTitle}
					<div class="text-sm text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-1">
						{order.firstItemTitle}
						{#if order.itemCount > 1}
							<span class="text-neutral-400 ml-1">+ {order.itemCount - 1} more</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Action -->
		<div
			class="flex items-center text-xs font-sans font-medium tracking-wide uppercase text-neutral-500 group-hover:text-black dark:group-hover:text-white transition-colors"
		>
			View Details
			<ChevronRight size={16} class="ml-1" />
		</div>
	</div>
</a>
