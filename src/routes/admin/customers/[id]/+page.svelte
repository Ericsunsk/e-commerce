<script lang="ts">
	import { MapPin, ReceiptText } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { getOrderStatusLabel } from '$domains/order';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const customer = $derived(data.customer);
</script>

<svelte:head>
	<title>{customer.email} | 客户 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-4xl">
	<a
		href="/admin/customers"
		class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900"
	>
		← 返回客户列表
	</a>

	<div>
		<h1 class="text-xl font-mono font-bold text-zinc-900 break-all">{customer.email}</h1>
		<p class="text-xs text-zinc-500 mt-1">
			{customer.verified ? '邮箱已验证' : '邮箱未验证'} · {customer.orders.length} 个订单（近 10 单）
		</p>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<section class="bg-white border border-zinc-200 rounded-card overflow-hidden h-fit">
			<div class="p-5 border-b border-zinc-100 flex items-center gap-2">
				<UiIcon icon={MapPin} size={16} class="text-zinc-500" />
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">收货地址</h2>
			</div>
			{#if customer.addresses.length === 0}
				<p class="p-5 text-sm text-zinc-400">暂无收货地址</p>
			{:else}
				<ul class="divide-y divide-zinc-100">
					{#each customer.addresses as address (address.id)}
						<li class="p-5">
							<p class="text-sm font-semibold text-zinc-900">
								{address.recipientName || '—'}
								{#if address.isDefault}
									<span class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">默认</span>
								{/if}
							</p>
							<p class="text-xs text-zinc-500 mt-1">{address.address}</p>
							{#if address.phone}
								<p class="text-xs text-zinc-500 font-mono mt-0.5">{address.phone}</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="bg-white border border-zinc-200 rounded-card overflow-hidden h-fit">
			<div class="p-5 border-b border-zinc-100 flex items-center gap-2">
				<UiIcon icon={ReceiptText} size={16} class="text-zinc-500" />
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">历史订单</h2>
			</div>
			{#if customer.orders.length === 0}
				<p class="p-5 text-sm text-zinc-400">暂无订单</p>
			{:else}
				<ul class="divide-y divide-zinc-100">
					{#each customer.orders as order (order.id)}
						<li>
							<a href="/admin/orders/{order.id}" class="flex items-center justify-between gap-4 p-5 hover:bg-zinc-50/70">
								<div class="min-w-0">
									<p class="text-sm font-mono text-zinc-900">#{order.id.slice(0, 8)}</p>
									<p class="text-[11px] text-zinc-400 mt-0.5">
										{order.date} · {getOrderStatusLabel(order.status)}
									</p>
								</div>
								<p class="text-sm font-bold text-zinc-900 shrink-0">
									{order.total} {order.currency.toUpperCase()}
								</p>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
