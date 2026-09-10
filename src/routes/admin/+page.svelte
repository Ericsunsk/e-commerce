<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const cards = $derived([
		{ label: 'Total GMV', value: data.gmv },
		{ label: 'Pending Shipments', value: String(data.pendingShipments) },
		{ label: 'Low-Stock Variants', value: String(data.lowStockCount) }
	]);
</script>

<svelte:head>
	<title>Dashboard | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h1 class="text-2xl font-display uppercase tracking-widest mb-8">Operations</h1>

<!-- Metric cards -->
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
	{#each cards as card (card.label)}
		<div class="border border-white/10 p-6">
			<p class="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">{card.label}</p>
			<p class="text-3xl font-display">{card.value}</p>
		</div>
	{/each}
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<!-- Low stock -->
	<section class="border border-white/10 p-6">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xs uppercase tracking-[0.2em] text-white/50">Low Stock ≤ 5</h2>
			<a href="/admin/products" class="text-[11px] uppercase tracking-widest text-white/60 hover:text-white">
				Manage →
			</a>
		</div>
		{#if data.lowStock.length === 0}
			<p class="text-sm text-white/40">All variants healthy</p>
		{:else}
			<ul class="divide-y divide-white/5">
				{#each data.lowStock as row (row.variantId)}
					<li class="py-3 flex items-center justify-between gap-4">
						<div class="min-w-0">
							<a href="/admin/products/{row.productId}" class="text-sm hover:underline truncate block">
								{row.productTitle}
							</a>
							<p class="text-[10px] text-white/40 font-mono">{row.sku}{row.detail ? ` · ${row.detail}` : ''}</p>
						</div>
						<span class="text-sm font-mono {row.stockQuantity === 0 ? 'text-red-400' : 'text-amber-300'}">
							{row.stockQuantity}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Recent orders -->
	<section class="border border-white/10 p-6">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xs uppercase tracking-[0.2em] text-white/50">Recent Orders</h2>
			<a href="/admin/orders" class="text-[11px] uppercase tracking-widest text-white/60 hover:text-white">
				Fulfill →
			</a>
		</div>
		{#if data.recentOrders.length === 0}
			<p class="text-sm text-white/40">No orders yet</p>
		{:else}
			<ul class="divide-y divide-white/5">
				{#each data.recentOrders as order (order.id)}
					<li class="py-3 flex items-center justify-between gap-4">
						<div class="min-w-0">
							<a href="/admin/orders/{order.id}" class="text-sm font-mono hover:underline block">
								{order.id.slice(0, 8)}…
							</a>
							<p class="text-[10px] text-white/40 truncate">{order.email} · {order.date}</p>
						</div>
						<div class="text-right shrink-0">
							<p class="text-sm">{order.totalFormatted}</p>
							<p class="text-[10px] uppercase tracking-widest text-white/40">{order.status}</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
