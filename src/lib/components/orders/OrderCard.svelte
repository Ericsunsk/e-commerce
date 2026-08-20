<script lang="ts">
	import type { OrderSummary } from '$lib/types';
	import { ArrowUpRight } from 'lucide-svelte';
	import { parsePocketBaseDate } from '$lib/utils/date';
	import { getOrderStatusColor } from '$lib/utils/order-status';
	import { formatCurrency } from '$lib/utils/price';

	let { order } = $props<{ order: OrderSummary }>();

	// Formatters
	let dateFormatter = $derived(
		new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

	const safeDate = $derived.by(() => parsePocketBaseDate(order.date));
</script>

<a
	href="/account/orders/{order.id}"
	data-sveltekit-preload-data="hover"
	class="group relative block p-8 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary dark:focus-visible:outline-white"
>
	<div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
		<!-- Left: Date & ID -->
		<div class="flex flex-col gap-2 min-w-[200px]">
			<span class="font-sans text-[10px] uppercase tracking-[0.15em] text-neutral-500">
				{safeDate ? dateFormatter.format(safeDate) : 'Unknown Date'}
			</span>
			<span class="font-mono text-xs text-neutral-400 uppercase tracking-wider">
				#{order.id.slice(0, 8)}
			</span>
		</div>

		<!-- Middle: Items & Status -->
		<div class="flex-1">
			<h3
				class="font-display text-lg text-text-main dark:text-white mb-2 group-hover:underline decoration-1 underline-offset-4 decoration-neutral-300"
			>
				{order.firstItemTitle}
				{#if order.itemCount > 1}
					<span class="text-neutral-400 font-normal italic ml-1 text-base"
						>+ {order.itemCount - 1} more</span
					>
				{/if}
			</h3>
			<div class="flex items-center gap-3">
				<span
					class="font-sans text-[10px] font-bold uppercase tracking-[0.1em] {getOrderStatusColor(
						order.status
					)}"
				>
					{order.status}
				</span>
			</div>
		</div>

		<!-- Right: Price & Action -->
		<div
			class="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 min-w-[120px]"
		>
			<span class="font-sans text-sm font-medium text-text-main dark:text-white">
				{formatCurrency(order.total, { currency: order.currency, isCents: true })}
			</span>

			<div
				class="hidden md:flex items-center text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 group-hover:text-primary dark:group-hover:text-white transition-colors"
			>
				View
				<ArrowUpRight
					size={14}
					class="ml-1 opacity-0 group-hover:opacity-100 transition-[opacity,transform] -translate-y-1 group-hover:translate-y-0"
				/>
			</div>
		</div>
	</div>
</a>
