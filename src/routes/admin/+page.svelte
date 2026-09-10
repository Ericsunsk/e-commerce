<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const cards = $derived([
		{
			label: 'Total GMV',
			value: data.gmv,
			icon: 'payments',
			desc: 'Lifetime gross merchandise value',
			badge: 'Revenue',
			badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
		},
		{
			label: 'Pending Shipments',
			value: String(data.pendingShipments),
			icon: 'local_shipping',
			desc: 'Paid orders awaiting fulfillment',
			badge: data.pendingShipments > 0 ? 'Action Needed' : 'All Clear',
			badgeClass: data.pendingShipments > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
		},
		{
			label: 'Low-Stock Variants',
			value: String(data.lowStockCount),
			icon: 'warning',
			desc: 'Variants with inventory ≤ 5',
			badge: data.lowStockCount > 0 ? 'Restock Soon' : 'Healthy',
			badgeClass: data.lowStockCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
		}
	]);

	function statusBadge(status: string) {
		switch (status.toLowerCase()) {
			case 'paid':
			case 'processing':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			case 'shipped':
				return 'bg-sky-50 text-sky-700 border-sky-200';
			case 'delivered':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			case 'refunded':
				return 'bg-rose-50 text-rose-700 border-rose-200';
			default:
				return 'bg-zinc-100 text-zinc-700 border-zinc-200';
		}
	}
</script>

<svelte:head>
	<title>Dashboard | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">Operations Dashboard</h1>
			<p class="text-xs text-zinc-500 mt-1">Real-time overview of store revenue, inventory, and order fulfillment</p>
		</div>
		<div class="flex items-center gap-2.5">
			<a
				href="/admin/products/new"
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 shadow-xs transition-colors"
			>
				<span class="material-symbols-outlined text-base">add</span>
				New Product
			</a>
		</div>
	</div>

	<!-- Metric cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
		{#each cards as card (card.label)}
			<div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
				<div class="flex items-start justify-between">
					<span class="p-2 rounded-xl bg-zinc-100 text-zinc-700">
						<span class="material-symbols-outlined text-xl">{card.icon}</span>
					</span>
					<span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border {card.badgeClass}">
						{card.badge}
					</span>
				</div>
				<div class="mt-6">
					<p class="text-xs font-semibold uppercase tracking-wider text-zinc-500">{card.label}</p>
					<p class="text-3xl font-display font-bold text-zinc-900 mt-1">{card.value}</p>
					<p class="text-[11px] text-zinc-400 mt-1.5">{card.desc}</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Details Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Low stock alert -->
		<section class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col">
			<div class="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-500 text-lg">inventory</span>
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">Low Stock Alert (≤ 5 units)</h2>
				</div>
				<a
					href="/admin/products"
					class="text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors"
				>
					Manage Catalog
					<span class="material-symbols-outlined text-sm">arrow_forward</span>
				</a>
			</div>

			{#if data.lowStock.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center my-auto">
					<span class="material-symbols-outlined text-3xl text-emerald-500 mb-2">check_circle</span>
					<p class="text-sm font-semibold text-zinc-800">All Variants In Stock</p>
					<p class="text-xs text-zinc-400 mt-0.5">No products currently require urgent restocking</p>
				</div>
			{:else}
				<ul class="divide-y divide-zinc-100 -mx-2">
					{#each data.lowStock as row (row.variantId)}
						<li class="px-2 py-3 flex items-center justify-between gap-4 hover:bg-zinc-50/80 rounded-lg transition-colors">
							<div class="min-w-0">
								<a href="/admin/products/{row.productId}" class="text-sm font-semibold text-zinc-900 hover:text-zinc-600 truncate block">
									{row.productTitle}
								</a>
								<p class="text-xs text-zinc-400 font-mono mt-0.5">
									{row.sku}{row.detail ? ` · ${row.detail}` : ''}
								</p>
							</div>
							<span
								class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shrink-0 {row.stockQuantity === 0
									? 'bg-rose-50 text-rose-700 border-rose-200'
									: 'bg-amber-50 text-amber-700 border-amber-200'}"
							>
								{row.stockQuantity === 0 ? 'Out of Stock' : `${row.stockQuantity} left`}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Recent orders -->
		<section class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col">
			<div class="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-zinc-700 text-lg">receipt_long</span>
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">Recent Customer Orders</h2>
				</div>
				<a
					href="/admin/orders"
					class="text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors"
				>
					View All Orders
					<span class="material-symbols-outlined text-sm">arrow_forward</span>
				</a>
			</div>

			{#if data.recentOrders.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center my-auto">
					<span class="material-symbols-outlined text-3xl text-zinc-300 mb-2">inbox</span>
					<p class="text-sm font-semibold text-zinc-700">No Orders Yet</p>
					<p class="text-xs text-zinc-400 mt-0.5">Customer orders will show up here once placed</p>
				</div>
			{:else}
				<ul class="divide-y divide-zinc-100 -mx-2">
					{#each data.recentOrders as order (order.id)}
						<li class="px-2 py-3 flex items-center justify-between gap-4 hover:bg-zinc-50/80 rounded-lg transition-colors">
							<div class="min-w-0">
								<a href="/admin/orders/{order.id}" class="text-sm font-mono font-semibold text-zinc-900 hover:underline block">
									Order #{order.id.slice(0, 8)}
								</a>
								<p class="text-xs text-zinc-400 truncate mt-0.5">{order.email} · {order.date}</p>
							</div>
							<div class="text-right shrink-0 flex flex-col items-end gap-1">
								<p class="text-sm font-bold text-zinc-900">{order.totalFormatted}</p>
								<span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border {statusBadge(order.status)}">
									{order.status}
								</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
