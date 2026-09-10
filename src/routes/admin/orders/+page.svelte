<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const tabs = [
		{ id: 'all', label: 'All Orders' },
		{ id: 'unfulfilled', label: 'Paid / Unfulfilled' },
		{ id: 'shipped', label: 'Shipped' },
		{ id: 'delivered', label: 'Delivered' },
		{ id: 'refunded', label: 'Refunded' }
	];

	let search = $state('');

	let visible = $derived(
		data.orders.filter((order) => {
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return order.id.toLowerCase().includes(q) || order.email.toLowerCase().includes(q);
		})
	);

	function statusBadge(status: string): string {
		switch (status.toLowerCase()) {
			case 'paid':
			case 'processing':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			case 'shipped':
				return 'bg-sky-50 text-sky-700 border-sky-200';
			case 'delivered':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			case 'refunded':
			case 'cancelled':
				return 'bg-rose-50 text-rose-700 border-rose-200';
			default:
				return 'bg-zinc-100 text-zinc-700 border-zinc-200';
		}
	}
</script>

<svelte:head>
	<title>Orders | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">Orders Management</h1>
		<p class="text-xs text-zinc-500 mt-1">Review orders, manage fulfillment logistics, and process refunds</p>
	</div>

	<!-- Controls bar -->
	<div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
		<!-- Filter tabs -->
		<div class="flex flex-wrap items-center gap-1.5">
			{#each tabs as tab (tab.id)}
				{@const active = data.status === tab.id}
				<button
					onclick={() => goto(`?status=${tab.id}`)}
					class="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer {active
						? 'bg-zinc-900 text-white shadow-xs'
						: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Search -->
		<div class="relative w-full md:w-72">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">
				search
			</span>
			<input
				type="search"
				placeholder="Search order ID or email..."
				bind:value={search}
				aria-label="Search orders"
				class="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-900 transition-all"
			/>
		</div>
	</div>

	<!-- Table Card -->
	<div class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left min-w-[780px]">
				<thead>
					<tr class="bg-zinc-50/80 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
						<th class="px-5 py-3.5">Order ID</th>
						<th class="px-5 py-3.5">Date</th>
						<th class="px-5 py-3.5">Customer</th>
						<th class="px-5 py-3.5 text-right">Items</th>
						<th class="px-5 py-3.5 text-right">Total Amount</th>
						<th class="px-5 py-3.5 text-right">Fulfillment Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each visible as order (order.id)}
						<tr class="hover:bg-zinc-50/70 transition-colors">
							<td class="px-5 py-3.5">
								<a
									href="/admin/orders/{order.id}"
									class="text-xs font-mono font-bold text-zinc-900 hover:text-zinc-600 inline-flex items-center gap-1.5"
								>
									#{order.id.slice(0, 8)}
									<span class="material-symbols-outlined text-xs text-zinc-400">north_east</span>
								</a>
							</td>
							<td class="px-5 py-3.5 text-xs text-zinc-500">
								{order.date}
							</td>
							<td class="px-5 py-3.5 text-xs font-medium text-zinc-800 break-all">
								{order.email}
							</td>
							<td class="px-5 py-3.5 text-xs font-semibold text-zinc-700 text-right">
								{order.itemCount}
							</td>
							<td class="px-5 py-3.5 text-xs font-bold text-zinc-900 text-right">
								{order.total} <span class="text-[10px] font-semibold text-zinc-400">{order.currency.toUpperCase()}</span>
							</td>
							<td class="px-5 py-3.5 text-right">
								<span
									class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border {statusBadge(
										order.status
									)}"
								>
									{order.status}
								</span>
							</td>
						</tr>
					{/each}
					{#if visible.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-12 text-center text-sm text-zinc-400">
								<span class="material-symbols-outlined text-3xl text-zinc-300 block mb-2">inbox</span>
								No orders found matching the filter.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
