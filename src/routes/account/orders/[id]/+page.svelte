<script lang="ts">
	import type { PageData } from './$types';
	import AccountBackLink from '$lib/components/account/AccountBackLink.svelte';
	import AccountPageShell from '$lib/components/account/AccountPageShell.svelte';
	import OrderSummary from '$lib/components/orders/OrderSummary.svelte';
	import OrderItemThumbnail from '$lib/components/ui/OrderItemThumbnail.svelte';
	import { formatCurrency } from '$lib/utils/price';
	import { fade } from 'svelte/transition';

	let { data } = $props<{ data: PageData }>();

	type PriceItem = { price: number; quantity: number };

	let itemPriceScale = $derived.by(() => {
		const rawSum = data.order.items.reduce(
			(acc: number, item: PriceItem) => acc + item.price * item.quantity,
			0
		);
		if (rawSum <= 0) return 1;
		const ratio = data.order.total / rawSum;
		// Heuristic: if totals are ~100x larger, item prices are likely stored in dollars.
		return ratio > 20 ? 100 : 1;
	});

	function lineTotalCents(item: PriceItem): number {
		const unitCents = itemPriceScale === 100 ? Math.round(item.price * 100) : item.price;
		return unitCents * item.quantity;
	}

	let subtotalCents = $derived.by(() =>
		data.order.items.reduce((acc: number, item: PriceItem) => acc + lineTotalCents(item), 0)
	);
	let adjustmentCents = $derived.by(() => data.order.total - subtotalCents);
</script>

<AccountPageShell>
	<AccountBackLink href="/account/orders" label="Back to History" className="mb-12" />

	<!-- Header & Summary -->
	<div in:fade={{ duration: 500 }}>
		<OrderSummary order={data.order} />
	</div>

	<!-- Items List -->
	<div class="space-y-12" in:fade={{ delay: 200, duration: 500 }}>
		<h2 class="font-display text-2xl text-text-main dark:text-white uppercase tracking-[0.05em]">
			Purchase Details
		</h2>

		<div class="flex flex-col gap-10">
			{#each data.order.items as item (item.id)}
				<div class="py-8 flex gap-8">
					<!-- Image -->
					<div class="w-24 h-32 bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0">
						{#if item.image}
							<OrderItemThumbnail
								src={item.image}
								alt={item.title}
								wrapperClass="w-full h-full bg-transparent"
								imageClassName="w-full h-full object-cover"
							/>
						{:else}
							<div
								class="w-full h-full flex items-center justify-center text-neutral-300 text-[10px] uppercase"
							>
								No Img
							</div>
						{/if}
					</div>

					<!-- Details -->
					<div class="flex-1 flex flex-col justify-between py-1">
						<div class="flex justify-between items-start gap-4">
							<div>
								<h3 class="font-display text-lg text-text-main dark:text-white mb-2">
									{item.title}
								</h3>
								{#if item.variant}
									<p class="text-xs font-mono uppercase text-neutral-500 mb-1">{item.variant}</p>
								{/if}
								<p class="text-xs font-mono uppercase text-neutral-500">Qty: {item.quantity}</p>
							</div>
							<p class="font-sans font-medium text-text-main dark:text-white">
								{formatCurrency(lineTotalCents(item), {
									currency: data.order.currency,
									isCents: true
								})}
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Totals -->
		<div class="flex flex-col items-end pt-8">
			<div class="w-full max-w-xs space-y-4">
				<div
					class="flex justify-between items-center text-sm font-sans uppercase tracking-widest text-neutral-500"
				>
					<span>Subtotal</span>
					<span
						>{formatCurrency(subtotalCents, { currency: data.order.currency, isCents: true })}</span
					>
				</div>
				{#if adjustmentCents !== 0}
					<div
						class="flex justify-between items-center text-sm font-sans uppercase tracking-widest text-neutral-500"
					>
						<span>{adjustmentCents > 0 ? 'Tax & Shipping' : 'Discounts'}</span>
						<span
							>{formatCurrency(adjustmentCents, {
								currency: data.order.currency,
								isCents: true
							})}</span
						>
					</div>
				{/if}
				<div
					class="flex justify-between items-center pt-4 border-t border-primary dark:border-white"
				>
					<span class="font-bold text-text-main dark:text-white uppercase tracking-widest"
						>Total</span
					>
					<span class="font-display text-2xl text-text-main dark:text-white">
						{formatCurrency(data.order.total, { currency: data.order.currency, isCents: true })}
					</span>
				</div>
			</div>
		</div>
	</div>
</AccountPageShell>
