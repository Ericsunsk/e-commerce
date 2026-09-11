<script lang="ts">
	import { ArrowUpRight, Inbox, Search } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { goto } from '$app/navigation';
	import { getOrderStatusBadgeClass, getOrderStatusLabel } from '$domains/order';
	import { ADMIN_BUTTONS } from '$shared/kernel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const tabs = [
		{ id: 'all', label: '全部订单' },
		{ id: 'unfulfilled', label: '已付款/待发货' },
		{ id: 'shipped', label: '已发货' },
		{ id: 'delivered', label: '已送达' },
		{ id: 'refunded', label: '已退款' }
	];

	let search = $state('');

	let visible = $derived(
		data.orders.filter((order) => {
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return order.id.toLowerCase().includes(q) || order.email.toLowerCase().includes(q);
		})
	);
</script>

<svelte:head>
	<title>订单 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
			订单管理
		</h1>
		<p class="text-xs text-zinc-500 mt-1">查看订单、管理发货物流、处理退款</p>
	</div>

	<!-- Controls bar -->
	<div
		class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs"
	>
		<!-- Filter tabs -->
		<div class="flex flex-wrap items-center gap-1.5">
			{#each tabs as tab (tab.id)}
				{@const active = data.status === tab.id}
				<button
					onclick={() => goto(`?status=${tab.id}`)}
					class={active ? ADMIN_BUTTONS.pillActive : ADMIN_BUTTONS.pillInactive}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Search -->
		<div class="relative w-full md:w-72">
			<UiIcon
				icon={Search}
				size={18}
				class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
			/>
			<input
				type="search"
				placeholder="搜索订单号或邮箱..."
				bind:value={search}
				aria-label="搜索订单"
				class="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-900 transition-all"
			/>
		</div>
	</div>

	<!-- Table Card -->
	<div class="bg-white border border-zinc-200 rounded-card shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left min-w-[780px]">
				<thead>
					<tr
						class="bg-zinc-50/80 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500"
					>
						<th class="px-5 py-3.5">订单号</th>
						<th class="px-5 py-3.5">日期</th>
						<th class="px-5 py-3.5">客户</th>
						<th class="px-5 py-3.5 text-right">件数</th>
						<th class="px-5 py-3.5 text-right">总金额</th>
						<th class="px-5 py-3.5 text-right">履约状态</th>
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
									<UiIcon icon={ArrowUpRight} size={12} class="text-zinc-400" />
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
								{order.total}
								<span class="text-[10px] font-semibold text-zinc-400"
									>{order.currency.toUpperCase()}</span
								>
							</td>
							<td class="px-5 py-3.5 text-right">
								<span
									class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border {getOrderStatusBadgeClass(
										order.status
									)}"
								>
									{getOrderStatusLabel(order.status)}
								</span>
							</td>
						</tr>
					{/each}
					{#if visible.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-12 text-center text-sm text-zinc-400">
								<UiIcon icon={Inbox} size={30} class="text-zinc-300 block mb-2 mx-auto" />
								没有符合筛选条件的订单。
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
