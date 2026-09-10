<script lang="ts">
	import { BarChart, PieChart } from 'layerchart';
	import {
		Wallet,
		Truck,
		TriangleAlert,
		ArrowRight,
		CircleCheck,
		ReceiptText,
		Inbox,
		Package
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { getOrderStatusBadgeClass, getOrderStatusLabel } from '$domains/order';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const cards = $derived([
		{
			label: '总 GMV',
			value: data.gmv,
			icon: Wallet,
			desc: '累计商品交易总额',
			badge: '营收',
			badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
		},
		{
			label: '待发货',
			value: String(data.pendingShipments),
			icon: Truck,
			desc: '已付款待履约订单',
			badge: data.pendingShipments > 0 ? '需要处理' : '全部完成',
			badgeClass:
				data.pendingShipments > 0
					? 'bg-amber-50 text-amber-700 border-amber-200'
					: 'bg-zinc-50 text-zinc-600 border-zinc-200'
		},
		{
			label: '低库存规格',
			value: String(data.lowStockCount),
			icon: TriangleAlert,
			desc: '库存 ≤ 5 的商品规格',
			badge: data.lowStockCount > 0 ? '尽快补货' : '库存健康',
			badgeClass:
				data.lowStockCount > 0
					? 'bg-rose-50 text-rose-700 border-rose-200'
					: 'bg-zinc-50 text-zinc-600 border-zinc-200'
		}
	]);

	const STATUS_COLORS: Record<string, string> = {
		paid: '#f59e0b',
		processing: '#fbbf24',
		shipped: '#0ea5e9',
		delivered: '#10b981',
		refunded: '#f43f5e',
		partially_refunded: '#fb7185',
		cancelled: '#71717a',
		pending: '#a1a1aa',
		returned: '#8b5cf6'
	};

	function statusColor(status: string): string {
		return STATUS_COLORS[status.toLowerCase()] ?? '#52525b';
	}

	let pieSeries = $derived(
		data.ordersByStatus.map((slice) => ({
			key: slice.key,
			label: slice.label,
			value: (d: { value: number }) => d.value,
			color: statusColor(slice.key)
		}))
	);
</script>

<svelte:head>
	<title>仪表盘 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
				运营总览
			</h1>
			<p class="text-xs text-zinc-500 mt-1">店铺营收、库存与订单履约实时概览</p>
		</div>
	</div>

	<!-- Metric cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
		{#each cards as card (card.label)}
			{@const CardIcon = card.icon}
			<div
				class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors"
			>
				<div class="flex items-start justify-between">
					<span class="p-2 rounded-xl bg-zinc-100 text-zinc-700">
						<UiIcon icon={CardIcon} size={20} />
					</span>
					<span
						class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border {card.badgeClass}"
					>
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

	<!-- Charts -->
	<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
		<section class="lg:col-span-3 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
			<div class="flex items-center justify-between pb-4 mb-2">
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">近 14 天营收趋势</h2>
				<span class="text-[10px] text-zinc-400">单位：{data.currency.toUpperCase()}</span>
			</div>
			<div class="h-64">
				<BarChart
					data={data.revenueTrend}
					x="date"
					y="revenue"
					series={[{ key: 'revenue', label: '日营收', color: '#18181b' }]}
					axis="x"
					grid={{ y: true }}
				/>
			</div>
		</section>

		<section class="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
			<div class="pb-4 mb-2">
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">订单状态分布</h2>
			</div>
			{#if data.ordersByStatus.length === 0}
				<div class="h-64 flex items-center justify-center">
					<p class="text-sm text-zinc-400">暂无订单数据</p>
				</div>
			{:else}
				<div class="h-64">
					<PieChart data={data.ordersByStatus} key="key" value="value" series={pieSeries} />
				</div>
				<ul class="mt-2 space-y-1">
					{#each data.ordersByStatus as slice (slice.key)}
						<li class="flex items-center justify-between text-xs">
							<span class="flex items-center gap-2 text-zinc-600">
								<span
									class="inline-block w-2.5 h-2.5 rounded-sm"
									style="background-color: {statusColor(slice.key)}"
								></span>
								{slice.label}
							</span>
							<span class="font-mono font-bold text-zinc-900">{slice.value}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<!-- Details Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Low stock alert -->
		<section class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col">
			<div class="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
				<div class="flex items-center gap-2">
					<UiIcon icon={Package} size={18} class="text-amber-500" />
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">
						低库存预警（≤ 5 件）
					</h2>
				</div>
				<a
					href="/admin/products"
					class="text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors"
				>
					管理商品
					<UiIcon icon={ArrowRight} size={14} />
				</a>
			</div>

			{#if data.lowStock.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center my-auto">
					<UiIcon icon={CircleCheck} size={30} class="text-emerald-500 mb-2" />
					<p class="text-sm font-semibold text-zinc-800">全部规格库存充足</p>
					<p class="text-xs text-zinc-400 mt-0.5">暂无需要紧急补货的商品</p>
				</div>
			{:else}
				<ul class="divide-y divide-zinc-100 -mx-2">
					{#each data.lowStock as row (row.variantId)}
						<li
							class="px-2 py-3 flex items-center justify-between gap-4 hover:bg-zinc-50/80 rounded-lg transition-colors"
						>
							<div class="min-w-0">
								<a
									href="/admin/products/{row.productId}"
									class="text-sm font-semibold text-zinc-900 hover:text-zinc-600 truncate block"
								>
									{row.productTitle}
								</a>
								<p class="text-xs text-zinc-400 font-mono mt-0.5">
									{row.sku}{row.detail ? ` · ${row.detail}` : ''}
								</p>
							</div>
							<span
								class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shrink-0 {row.stockQuantity ===
								0
									? 'bg-rose-50 text-rose-700 border-rose-200'
									: 'bg-amber-50 text-amber-700 border-amber-200'}"
							>
								{row.stockQuantity === 0 ? '缺货' : `仅剩 ${row.stockQuantity} 件`}
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
					<UiIcon icon={ReceiptText} size={18} class="text-zinc-700" />
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">最新客户订单</h2>
				</div>
				<a
					href="/admin/orders"
					class="text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors"
				>
					查看全部订单
					<UiIcon icon={ArrowRight} size={14} />
				</a>
			</div>

			{#if data.recentOrders.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center my-auto">
					<UiIcon icon={Inbox} size={30} class="text-zinc-300 mb-2" />
					<p class="text-sm font-semibold text-zinc-700">暂无订单</p>
					<p class="text-xs text-zinc-400 mt-0.5">客户下单后会显示在这里</p>
				</div>
			{:else}
				<ul class="divide-y divide-zinc-100 -mx-2">
					{#each data.recentOrders as order (order.id)}
						<li
							class="px-2 py-3 flex items-center justify-between gap-4 hover:bg-zinc-50/80 rounded-lg transition-colors"
						>
							<div class="min-w-0">
								<a
									href="/admin/orders/{order.id}"
									class="text-sm font-mono font-semibold text-zinc-900 hover:underline block"
								>
									订单 #{order.id.slice(0, 8)}
								</a>
								<p class="text-xs text-zinc-400 truncate mt-0.5">{order.email} · {order.date}</p>
							</div>
							<div class="text-right shrink-0 flex flex-col items-end gap-1">
								<p class="text-sm font-bold text-zinc-900">{order.totalFormatted}</p>
								<span
									class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border {getOrderStatusBadgeClass(
										order.status
									)}"
								>
									{getOrderStatusLabel(order.status)}
								</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
