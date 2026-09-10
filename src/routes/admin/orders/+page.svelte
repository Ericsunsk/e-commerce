<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const tabs = [
		{ id: 'all', label: 'All' },
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

	function statusClass(status: string): string {
		switch (status) {
			case 'paid':
			case 'processing':
				return 'bg-amber-400/10 text-amber-300';
			case 'shipped':
				return 'bg-sky-400/10 text-sky-300';
			case 'delivered':
				return 'bg-emerald-400/10 text-emerald-300';
			case 'refunded':
			case 'cancelled':
				return 'bg-white/10 text-white/50';
			default:
				return 'bg-white/10 text-white/70';
		}
	}
</script>

<svelte:head>
	<title>Orders | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h1 class="text-2xl font-display uppercase tracking-widest mb-8">Orders</h1>

<div class="flex flex-wrap items-center gap-2 mb-4">
	{#each tabs as tab (tab.id)}
		<button
			onclick={() => goto(`?status=${tab.id}`)}
			class="px-4 py-2 text-[11px] uppercase tracking-widest border {data.status === tab.id
				? 'bg-white text-black border-white'
				: 'border-white/20 text-white/60 hover:text-white'}"
		>
			{tab.label}
		</button>
	{/each}
	<input
		type="search"
		placeholder="Search id or email"
		bind:value={search}
		aria-label="Search orders"
		class="ml-auto bg-transparent border border-white/20 px-4 py-2 text-sm outline-none focus:border-white placeholder:text-white/30"
	/>
</div>

<div class="border border-white/10 overflow-x-auto">
	<table class="w-full text-left min-w-[760px]">
		<thead>
			<tr class="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
				<th class="px-4 py-3">Order</th>
				<th class="px-4 py-3">Buyer</th>
				<th class="px-4 py-3 text-right">Items</th>
				<th class="px-4 py-3 text-right">Total</th>
				<th class="px-4 py-3">Status</th>
			</tr>
		</thead>
		<tbody>
			{#each visible as order (order.id)}
				<tr class="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
					<td class="px-4 py-3">
						<a href="/admin/orders/{order.id}" class="hover:underline">
							<p class="text-sm font-mono">{order.id.slice(0, 8)}…</p>
							<p class="text-[10px] text-white/40">{order.date}</p>
						</a>
					</td>
					<td class="px-4 py-3 text-sm break-all">{order.email}</td>
					<td class="px-4 py-3 text-sm text-right">{order.itemCount}</td>
					<td class="px-4 py-3 text-sm text-right">
						{order.total} {order.currency.toUpperCase()}
					</td>
					<td class="px-4 py-3">
						<span
							class="inline-block px-2 py-1 text-[10px] uppercase tracking-widest {statusClass(
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
					<td colspan="5" class="px-4 py-10 text-center text-sm text-white/40">No orders found</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>
