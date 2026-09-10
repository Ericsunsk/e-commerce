<script lang="ts">
	import { AreaChart } from 'layerchart';
	import { curveMonotoneX } from 'd3-shape';
	import {
		Wallet,
		Truck,
		TriangleAlert,
		ArrowRight,
		ArrowUpRight,
		ArrowDownRight,
		CircleCheck,
		ReceiptText,
		Inbox,
		Package,
		TrendingUp,
		Minus,
		Flame,
		RotateCcw,
		Users,
		Layers,
		ShoppingBag
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { ICONS } from '$shared/kernel';
	import { getOrderStatusBadgeClass, getOrderStatusLabel, type TimeRangeKey } from '$domains/order';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedRange = $state<TimeRangeKey>('7d');
	let chartMetric = $state<'revenue' | 'orders'>('revenue');
	let productTab = $state<'top' | 'stock'>('top');
	let orderTab = $state<'orders' | 'customers'>('orders');

	const activeRange = $derived(data.ranges[selectedRange]);

	const rangeLabels: { key: TimeRangeKey; label: string }[] = [
		{ key: 'today', label: '今日' },
		{ key: '7d', label: '近 7 天' },
		{ key: '30d', label: '近 30 天' },
		{ key: 'all', label: '全部' }
	];

	function getSparkline(values: number[]) {
		if (!values || values.length === 0) return { points: '', area: '' };
		const width = 96;
		const height = 30;
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;
		const pad = 2;
		const h = height - pad * 2;

		const coords = values.map((v, i) => {
			const x = (i / Math.max(values.length - 1, 1)) * width;
			const y = height - pad - ((v - min) / range) * h;
			return [Number(x.toFixed(1)), Number(y.toFixed(1))];
		});

		const points = coords.map(([x, y]) => `${x},${y}`).join(' ');
		const area =
			`M ${coords[0][0]},${coords[0][1]} ` +
			coords
				.slice(1)
				.map(([x, y]) => `L ${x},${y}`)
				.join(' ') +
			` L ${width},${height} L 0,${height} Z`;

		return { points, area };
	}

	const STATUS_COLORS: Record<string, string> = {
		paid: '#f59e0b',
		processing: '#eab308',
		shipped: '#0ea5e9',
		delivered: '#10b981',
		refunded: '#f43f5e',
		partially_refunded: '#fb7185',
		cancelled: '#71717a',
		pending: '#a1a1aa',
		returned: '#8b5cf6'
	};

	function statusColor(status: string): string {
		return STATUS_COLORS[status.toLowerCase()] ?? '#71717a';
	}

	const gmvSpark = $derived(getSparkline(activeRange.sparkline));
	const ordersSpark = $derived(getSparkline(activeRange.trend.map((p) => p.orders)));
	const aovSpark = $derived(getSparkline(activeRange.sparkline));
</script>

<svelte:head>
	<title>运营仪表盘 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-8">
	<!-- Header with Time Range Switcher -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
				运营总览
			</h1>
			<p class="text-xs text-zinc-500 mt-1">实时业务指标、走势洞察与履约健康度</p>
		</div>

		<!-- Time Range Segmented Pills -->
		<div class="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/70 self-start sm:self-auto">
			{#each rangeLabels as r (r.key)}
				{@const active = selectedRange === r.key}
				<button
					type="button"
					onclick={() => (selectedRange = r.key)}
					class="px-3 py-1.5 rounded-lg text-xs tracking-wider transition-all duration-150 cursor-pointer {active
						? 'bg-white text-zinc-900 font-semibold shadow-xs'
						: 'text-zinc-500 hover:text-zinc-900 font-normal'}"
				>
					{r.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- 4-Card KPI Row with Sparklines -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
		<!-- KPI 1: GMV -->
		<div class="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-2">
					<UiIcon icon={Wallet} size={15} strokeWidth={ICONS.strokeWidth} class="text-zinc-600" />
					总营收 (GMV)
				</span>
				{#if activeRange.gmvChange > 0}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-mono">
						<UiIcon icon={ArrowUpRight} size={11} strokeWidth={2} />
						+{activeRange.gmvChange}%
					</span>
				{:else if activeRange.gmvChange < 0}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 font-mono">
						<UiIcon icon={ArrowDownRight} size={11} strokeWidth={2} />
						{activeRange.gmvChange}%
					</span>
				{:else}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-200/60 font-mono">
						<UiIcon icon={Minus} size={11} />
						0.0%
					</span>
				{/if}
			</div>

			<div class="mt-4 flex items-end justify-between gap-2">
				<div>
					<p class="text-2xl font-display font-bold text-zinc-900 tracking-tight">{activeRange.gmvFormatted}</p>
					<p class="text-[11px] text-zinc-400 mt-1">共 {activeRange.ordersCount} 笔订单累计</p>
				</div>
				<!-- SVG Sparkline -->
				<div class="shrink-0">
					<svg viewBox="0 0 96 30" class="w-20 h-7 overflow-visible">
						<defs>
							<linearGradient id="spark-gmv" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color={activeRange.gmvChange >= 0 ? '#10b981' : '#f43f5e'} stop-opacity="0.25" />
								<stop offset="100%" stop-color={activeRange.gmvChange >= 0 ? '#10b981' : '#f43f5e'} stop-opacity="0.0" />
							</linearGradient>
						</defs>
						{#if gmvSpark.area}
							<path d={gmvSpark.area} fill="url(#spark-gmv)" />
						{/if}
						{#if gmvSpark.points}
							<polyline
								fill="none"
								stroke={activeRange.gmvChange >= 0 ? '#10b981' : '#f43f5e'}
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
								points={gmvSpark.points}
							/>
						{/if}
					</svg>
				</div>
			</div>
		</div>

		<!-- KPI 2: Orders Count -->
		<div class="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-2">
					<UiIcon icon={ReceiptText} size={15} strokeWidth={ICONS.strokeWidth} class="text-zinc-600" />
					订单总量
				</span>
				{#if activeRange.ordersChange > 0}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-mono">
						<UiIcon icon={ArrowUpRight} size={11} strokeWidth={2} />
						+{activeRange.ordersChange}%
					</span>
				{:else if activeRange.ordersChange < 0}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 font-mono">
						<UiIcon icon={ArrowDownRight} size={11} strokeWidth={2} />
						{activeRange.ordersChange}%
					</span>
				{:else}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-200/60 font-mono">
						<UiIcon icon={Minus} size={11} />
						0.0%
					</span>
				{/if}
			</div>

			<div class="mt-4 flex items-end justify-between gap-2">
				<div>
					<p class="text-2xl font-display font-bold text-zinc-900 tracking-tight">{activeRange.ordersCount} <span class="text-xs font-normal text-zinc-500">单</span></p>
					<p class="text-[11px] text-zinc-400 mt-1">{activeRange.uniqueCustomers} 位独立客户下单</p>
				</div>
				<!-- SVG Sparkline -->
				<div class="shrink-0">
					<svg viewBox="0 0 96 30" class="w-20 h-7 overflow-visible">
						<defs>
							<linearGradient id="spark-orders" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color={activeRange.ordersChange >= 0 ? '#10b981' : '#f43f5e'} stop-opacity="0.25" />
								<stop offset="100%" stop-color={activeRange.ordersChange >= 0 ? '#10b981' : '#f43f5e'} stop-opacity="0.0" />
							</linearGradient>
						</defs>
						{#if ordersSpark.area}
							<path d={ordersSpark.area} fill="url(#spark-orders)" />
						{/if}
						{#if ordersSpark.points}
							<polyline
								fill="none"
								stroke={activeRange.ordersChange >= 0 ? '#10b981' : '#f43f5e'}
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
								points={ordersSpark.points}
							/>
						{/if}
					</svg>
				</div>
			</div>
		</div>

		<!-- KPI 3: AOV (Average Order Value) -->
		<div class="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-2">
					<UiIcon icon={TrendingUp} size={15} strokeWidth={ICONS.strokeWidth} class="text-zinc-600" />
					平均客单价 (AOV)
				</span>
				{#if activeRange.aovChange > 0}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-mono">
						<UiIcon icon={ArrowUpRight} size={11} strokeWidth={2} />
						+{activeRange.aovChange}%
					</span>
				{:else if activeRange.aovChange < 0}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 font-mono">
						<UiIcon icon={ArrowDownRight} size={11} strokeWidth={2} />
						{activeRange.aovChange}%
					</span>
				{:else}
					<span class="inline-flex items-center gap-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-200/60 font-mono">
						<UiIcon icon={Minus} size={11} />
						0.0%
					</span>
				{/if}
			</div>

			<div class="mt-4 flex items-end justify-between gap-2">
				<div>
					<p class="text-2xl font-display font-bold text-zinc-900 tracking-tight">{activeRange.aovFormatted}</p>
					<p class="text-[11px] text-zinc-400 mt-1">平均每单交易金额</p>
				</div>
				<!-- SVG Sparkline -->
				<div class="shrink-0">
					<svg viewBox="0 0 96 30" class="w-20 h-7 overflow-visible">
						<defs>
							<linearGradient id="spark-aov" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color={activeRange.aovChange >= 0 ? '#10b981' : '#f43f5e'} stop-opacity="0.25" />
								<stop offset="100%" stop-color={activeRange.aovChange >= 0 ? '#10b981' : '#f43f5e'} stop-opacity="0.0" />
							</linearGradient>
						</defs>
						{#if aovSpark.area}
							<path d={aovSpark.area} fill="url(#spark-aov)" />
						{/if}
						{#if aovSpark.points}
							<polyline
								fill="none"
								stroke={activeRange.aovChange >= 0 ? '#10b981' : '#f43f5e'}
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
								points={aovSpark.points}
							/>
						{/if}
					</svg>
				</div>
			</div>
		</div>

		<!-- KPI 4: Pending Shipments -->
		<div class="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-2">
					<UiIcon icon={Truck} size={15} strokeWidth={ICONS.strokeWidth} class="text-zinc-600" />
					待发货履约
				</span>
				<span
					class="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full border {data.pendingShipments > 0
						? 'bg-amber-50 text-amber-700 border-amber-200/60'
						: 'bg-emerald-50 text-emerald-700 border-emerald-200/60'}"
				>
					{data.pendingShipments > 0 ? '需尽快发货' : '全部已履约'}
				</span>
			</div>

			<div class="mt-4 flex items-end justify-between gap-2">
				<div>
					<p class="text-2xl font-display font-bold text-zinc-900 tracking-tight">{data.pendingShipments} <span class="text-xs font-normal text-zinc-500">单</span></p>
					<p class="text-[11px] text-zinc-400 mt-1">已付款待打包出库</p>
				</div>
				<a
					href="/admin/orders?status=paid"
					class="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1 rounded-lg transition-colors"
				>
					去发货
					<UiIcon icon={ArrowRight} size={12} />
				</a>
			</div>
		</div>
	</div>

	<!-- Main Analytics Grid: Trends + Pipeline -->
	<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
		<!-- Left: Core Trend Area Chart (3 cols) -->
		<section class="lg:col-span-3 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 gap-3">
				<div>
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-900">业务走势趋势</h2>
					<p class="text-[11px] text-zinc-400 mt-0.5">
						当前查看：{rangeLabels.find((r) => r.key === selectedRange)?.label}（{activeRange.trend.length} 个数据点）
					</p>
				</div>

				<!-- Metric Selector: Revenue vs Orders -->
				<div class="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/70 self-start sm:self-auto">
					<button
						type="button"
						onclick={() => (chartMetric = 'revenue')}
						class="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer {chartMetric === 'revenue'
							? 'bg-white text-zinc-900 shadow-xs'
							: 'text-zinc-500 hover:text-zinc-900'}"
					>
						营收额 ({data.currency.toUpperCase()})
					</button>
					<button
						type="button"
						onclick={() => (chartMetric = 'orders')}
						class="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer {chartMetric === 'orders'
							? 'bg-white text-zinc-900 shadow-xs'
							: 'text-zinc-500 hover:text-zinc-900'}"
					>
						订单量 (单)
					</button>
				</div>
			</div>

			<div class="h-64">
				{#if activeRange.trend.length === 0}
					<div class="h-full flex flex-col items-center justify-center text-center">
						<UiIcon icon={Inbox} size={28} class="text-zinc-300 mb-1.5" />
						<p class="text-xs text-zinc-400">该周期内暂无交易数据</p>
					</div>
				{:else}
					<AreaChart
						data={activeRange.trend}
						x="date"
						y={chartMetric}
						series={[
							{
								key: chartMetric,
								label: chartMetric === 'revenue' ? `日营收 (${data.currency.toUpperCase()})` : '日订单量',
								color: '#18181b'
							}
						]}
						axis="x"
						grid={{ y: true }}
						props={{
							area: {
								fillOpacity: 0.08,
								curve: curveMonotoneX
							}
						}}
					/>
				{/if}
			</div>
		</section>

		<!-- Right: Modern Fulfillment Pipeline (2 cols) -->
		<section class="lg:col-span-2 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between pb-3">
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-900">订单履约状态流</h2>
					<span class="text-xs font-mono text-zinc-500">{activeRange.ordersCount} 笔订单</span>
				</div>

				<!-- Segmented Multi-color Distribution Bar -->
				<div class="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden flex my-3">
					{#if activeRange.ordersCount === 0}
						<div class="h-full w-full bg-zinc-200 rounded-full" title="暂无订单"></div>
					{:else}
						{#each activeRange.statusDistribution as slice (slice.key)}
							{@const pct = (slice.value / activeRange.ordersCount) * 100}
							{#if pct > 0}
								<div
									class="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
									style="width: {pct}%; background-color: {statusColor(slice.key)}"
									title="{slice.label}: {slice.value} 单 ({pct.toFixed(1)}%)"
								></div>
							{/if}
						{/each}
					{/if}
				</div>

				<!-- Status rows list -->
				<div class="mt-4 space-y-2">
					{#if activeRange.statusDistribution.length === 0}
						<p class="text-xs text-zinc-400 text-center py-8">该周期内暂无状态分布数据</p>
					{:else}
						{#each activeRange.statusDistribution as slice (slice.key)}
							{@const pct = activeRange.ordersCount > 0 ? ((slice.value / activeRange.ordersCount) * 100).toFixed(1) : '0.0'}
							<a
								href="/admin/orders?status={slice.key}"
								class="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 transition-colors group text-xs"
							>
								<div class="flex items-center gap-2.5 min-w-0">
									<span
										class="w-2.5 h-2.5 rounded-full shrink-0"
										style="background-color: {statusColor(slice.key)}"
									></span>
									<span class="text-zinc-700 font-medium group-hover:text-zinc-900 truncate">
										{slice.label}
									</span>
								</div>
								<div class="flex items-center gap-3 font-mono shrink-0">
									<span class="text-zinc-400 text-[11px]">{pct}%</span>
									<span class="font-semibold text-zinc-900 w-8 text-right">{slice.value}</span>
								</div>
							</a>
						{/each}
					{/if}
				</div>
			</div>

			<div class="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
				<span>全量累计：{data.totalOrdersCount} 笔订单</span>
				<a href="/admin/orders" class="text-zinc-600 hover:text-zinc-900 font-medium flex items-center gap-0.5">
					进入订单中心
					<UiIcon icon={ArrowRight} size={11} />
				</a>
			</div>
		</section>
	</div>

	<!-- Bottom Section: Merchandising & Inventory + Customer Insights & Orders -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left Card: Merchandising & Inventory Health -->
		<section class="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Tab Controls & Quick Links -->
				<div class="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100 gap-2">
					<div class="inline-flex p-1 bg-zinc-100 rounded-xl">
						<button
							type="button"
							onclick={() => (productTab = 'top')}
							class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {productTab === 'top'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-500 hover:text-zinc-900'}"
						>
							<UiIcon icon={Flame} size={14} class={productTab === 'top' ? 'text-amber-500' : 'text-zinc-400'} />
							<span>畅销排行 Top 5</span>
						</button>
						<button
							type="button"
							onclick={() => (productTab = 'stock')}
							class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {productTab === 'stock'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-500 hover:text-zinc-900'}"
						>
							<UiIcon icon={TriangleAlert} size={14} class={productTab === 'stock' ? 'text-rose-500' : 'text-zinc-400'} />
							<span>库存预警</span>
							{#if data.lowStockCount > 0}
								<span class="ml-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
									{data.lowStockCount}
								</span>
							{/if}
						</button>
					</div>

					<a
						href="/admin/products"
						class="text-xs font-medium text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors shrink-0"
					>
						商品库
						<UiIcon icon={ArrowRight} size={13} />
					</a>
				</div>

				{#if productTab === 'top'}
					<!-- Top 5 Best Sellers with Horizontal Bar Chart -->
					{#if data.topProducts.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<UiIcon icon={ShoppingBag} size={28} class="text-zinc-300 mb-2" />
							<p class="text-xs font-semibold text-zinc-700">暂无商品销量记录</p>
							<p class="text-[11px] text-zinc-400 mt-0.5">当有已支付订单时，畅销商品排行将实时呈现</p>
						</div>
					{:else}
						<div class="space-y-3.5">
							{#each data.topProducts as product, index (product.productId)}
								<div class="group">
									<div class="flex items-center justify-between text-xs mb-1.5 gap-3">
										<div class="flex items-center gap-2 min-w-0">
											<span
												class="w-5 h-5 shrink-0 rounded-md flex items-center justify-center text-[11px] font-mono font-bold {index === 0
													? 'bg-amber-100 text-amber-800'
													: index === 1
														? 'bg-zinc-200 text-zinc-700'
														: index === 2
															? 'bg-orange-100 text-orange-800'
															: 'bg-zinc-100 text-zinc-500'}"
											>
												#{index + 1}
											</span>
											<a
												href="/admin/products/{product.productId}"
												class="font-medium text-zinc-800 hover:text-zinc-950 truncate hover:underline"
												title={product.title}
											>
												{product.title}
											</a>
										</div>
										<div class="flex items-center gap-3 shrink-0 text-right">
											<span class="text-zinc-400 text-[11px]">
												已售 <strong class="text-zinc-700 font-mono font-semibold">{product.unitsSold}</strong> 件
											</span>
											<span class="font-mono font-bold text-zinc-900 min-w-[70px]">
												{product.revenueFormatted}
											</span>
										</div>
									</div>
									<!-- Horizontal bar indicator -->
									<div class="h-2 w-full bg-zinc-100 rounded-full overflow-hidden flex">
										<div
											class="h-full rounded-full transition-all duration-500 {index === 0
												? 'bg-amber-500'
												: index === 1
													? 'bg-zinc-600'
													: index === 2
														? 'bg-orange-400'
														: 'bg-zinc-400'}"
											style="width: {Math.max(product.sharePercent, 3)}%"
											title="{product.sharePercent}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<!-- Low Stock Alert Tab -->
					{#if data.lowStock.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<UiIcon icon={CircleCheck} size={28} class="text-emerald-500 mb-2" />
							<p class="text-xs font-semibold text-zinc-800">全部规格库存充足</p>
							<p class="text-[11px] text-zinc-400 mt-0.5">暂无需要紧急补货的商品</p>
						</div>
					{:else}
						<ul class="divide-y divide-zinc-100 -mx-2 max-h-[300px] overflow-y-auto">
							{#each data.lowStock as row (row.variantId)}
								<li class="px-2 py-3 flex items-center justify-between gap-4 hover:bg-zinc-50/80 rounded-xl transition-colors">
									<div class="min-w-0">
										<a
											href="/admin/products/{row.productId}"
											class="text-xs font-semibold text-zinc-900 hover:underline truncate block"
										>
											{row.productTitle}
										</a>
										<p class="text-[11px] text-zinc-400 font-mono mt-0.5">
											{row.sku}{row.detail ? ` · ${row.detail}` : ''}
										</p>
									</div>
									<div class="flex items-center gap-3 shrink-0">
										<span
											class="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border {row.stockQuantity === 0
												? 'bg-rose-50 text-rose-700 border-rose-200'
												: 'bg-amber-50 text-amber-700 border-amber-200'}"
										>
											{row.stockQuantity === 0 ? '已售罄' : `仅剩 ${row.stockQuantity} 件`}
										</span>
										<a
											href="/admin/products/{row.productId}"
											class="text-zinc-400 hover:text-zinc-700 text-xs font-medium"
											title="去补货"
										>
											补货 →
										</a>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>

			<!-- Card Footer: Inventory Health Distribution Bar -->
			<div class="pt-4 mt-5 border-t border-zinc-100">
				<div class="flex items-center justify-between text-[11px] text-zinc-500 mb-2">
					<div class="flex items-center gap-1.5 font-medium">
						<UiIcon icon={Layers} size={13} class="text-zinc-400" />
						<span>全店规格分布</span>
						<span class="font-mono text-zinc-400">({data.catalogHealth.totalVariants} 款规格)</span>
					</div>
					<div class="flex items-center gap-3 text-[11px]">
						<span class="inline-flex items-center gap-1">
							<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
							充足 {data.catalogHealth.healthyCount}
						</span>
						<span class="inline-flex items-center gap-1">
							<span class="w-2 h-2 rounded-full bg-amber-500"></span>
							预警 {data.catalogHealth.lowStockCount}
						</span>
						<span class="inline-flex items-center gap-1">
							<span class="w-2 h-2 rounded-full bg-rose-500"></span>
							售罄 {data.catalogHealth.outOfStockCount}
						</span>
					</div>
				</div>
				<div class="h-2 w-full bg-zinc-100 rounded-full overflow-hidden flex">
					{#if data.catalogHealth.totalVariants > 0}
						<div
							class="bg-emerald-500 h-full transition-all"
							style="width: {(data.catalogHealth.healthyCount / data.catalogHealth.totalVariants) * 100}%"
						></div>
						<div
							class="bg-amber-500 h-full transition-all"
							style="width: {(data.catalogHealth.lowStockCount / data.catalogHealth.totalVariants) * 100}%"
						></div>
						<div
							class="bg-rose-500 h-full transition-all"
							style="width: {(data.catalogHealth.outOfStockCount / data.catalogHealth.totalVariants) * 100}%"
						></div>
					{:else}
						<div class="w-full bg-zinc-200 h-full"></div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Right Card: Live Orders & Customer Insights -->
		<section class="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Tab Controls & Quick Links -->
				<div class="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100 gap-2">
					<div class="inline-flex p-1 bg-zinc-100 rounded-xl">
						<button
							type="button"
							onclick={() => (orderTab = 'orders')}
							class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {orderTab === 'orders'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-500 hover:text-zinc-900'}"
						>
							<UiIcon icon={Package} size={14} class={orderTab === 'orders' ? 'text-indigo-600' : 'text-zinc-400'} />
							<span>最新订单</span>
							<span class="text-[10px] font-mono text-zinc-400">({data.recentOrders.length})</span>
						</button>
						<button
							type="button"
							onclick={() => (orderTab = 'customers')}
							class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {orderTab === 'customers'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-500 hover:text-zinc-900'}"
						>
							<UiIcon icon={Users} size={14} class={orderTab === 'customers' ? 'text-violet-600' : 'text-zinc-400'} />
							<span>客户资产</span>
							{#if data.customerInsights.repeatRatePercent > 0}
								<span class="ml-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-violet-100 text-violet-700">
									{data.customerInsights.repeatRatePercent}% 复购
								</span>
							{/if}
						</button>
					</div>

					<a
						href={orderTab === 'orders' ? '/admin/orders' : '/admin/customers'}
						class="text-xs font-medium text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors shrink-0"
					>
						{orderTab === 'orders' ? '全部订单' : '客户中心'}
						<UiIcon icon={ArrowRight} size={13} />
					</a>
				</div>

				{#if orderTab === 'orders'}
					<!-- Recent Orders Stream -->
					{#if data.recentOrders.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<UiIcon icon={Inbox} size={28} class="text-zinc-300 mb-2" />
							<p class="text-xs font-semibold text-zinc-700">暂无近期订单</p>
							<p class="text-[11px] text-zinc-400 mt-0.5">客户下单后会实时显示在此处</p>
						</div>
					{:else}
						<ul class="divide-y divide-zinc-100 -mx-2">
							{#each data.recentOrders as order (order.id)}
								<li class="px-2 py-3 flex items-center justify-between gap-4 hover:bg-zinc-50/80 rounded-xl transition-colors">
									<div class="min-w-0">
										<a
											href="/admin/orders/{order.id}"
											class="text-xs font-mono font-semibold text-zinc-900 hover:underline block truncate"
										>
											订单 #{order.id.slice(0, 8)}
										</a>
										<p class="text-[11px] text-zinc-400 truncate mt-0.5">
											{order.email} · {order.date ? order.date.slice(0, 16) : '未知时间'}
										</p>
									</div>
									<div class="text-right shrink-0 flex flex-col items-end gap-1">
										<p class="text-xs font-bold font-mono text-zinc-900">{order.totalFormatted}</p>
										<span
											class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border {getOrderStatusBadgeClass(
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
				{:else}
					<!-- Customer Assets & Cohorts -->
					<div class="space-y-4">
						<!-- Metric Cards Grid -->
						<div class="grid grid-cols-3 gap-3">
							<div class="bg-zinc-50/80 rounded-xl p-3 border border-zinc-100">
								<p class="text-[11px] text-zinc-400 font-medium">总活跃客户</p>
								<p class="text-lg font-bold font-mono text-zinc-900 mt-1">
									{data.customerInsights.totalCustomers}
									<span class="text-xs font-normal text-zinc-400">人</span>
								</p>
							</div>
							<div class="bg-zinc-50/80 rounded-xl p-3 border border-zinc-100">
								<p class="text-[11px] text-zinc-400 font-medium">老客复购率</p>
								<p class="text-lg font-bold font-mono text-violet-600 mt-1">
									{data.customerInsights.repeatRatePercent}%
								</p>
							</div>
							<div class="bg-zinc-50/80 rounded-xl p-3 border border-zinc-100">
								<p class="text-[11px] text-zinc-400 font-medium">复购贡献营收</p>
								<p class="text-base font-bold font-mono text-zinc-900 mt-1 truncate" title={data.customerInsights.repeatRevenueFormatted}>
									{data.customerInsights.repeatRevenueFormatted}
								</p>
							</div>
						</div>

						<!-- Cohort Ratio Bar -->
						<div class="bg-zinc-50/50 rounded-xl p-3.5 border border-zinc-100 space-y-2">
							<div class="flex items-center justify-between text-xs">
								<span class="font-medium text-zinc-700">新老客户比例结构</span>
								<span class="font-mono text-[11px] text-zinc-400">
									新客 {data.customerInsights.newCustomers} 人 · 复购 {data.customerInsights.repeatCustomers} 人
								</span>
							</div>

							<div class="h-3 w-full bg-zinc-200 rounded-full overflow-hidden flex">
								{#if data.customerInsights.totalCustomers > 0}
									<div
										class="bg-indigo-500 h-full transition-all flex items-center justify-center text-[9px] font-bold text-white"
										style="width: {(data.customerInsights.newCustomers / data.customerInsights.totalCustomers) * 100}%"
										title="首购新客: {data.customerInsights.newCustomers} 人"
									></div>
									<div
										class="bg-violet-600 h-full transition-all flex items-center justify-center text-[9px] font-bold text-white"
										style="width: {(data.customerInsights.repeatCustomers / data.customerInsights.totalCustomers) * 100}%"
										title="复购老客: {data.customerInsights.repeatCustomers} 人"
									></div>
								{:else}
									<div class="w-full bg-zinc-200 h-full"></div>
								{/if}
							</div>

							<div class="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
								<div class="flex items-center gap-1.5">
									<span class="w-2 h-2 rounded-full bg-indigo-500"></span>
									<span>首购新客 ({data.customerInsights.totalCustomers > 0 ? Math.round((data.customerInsights.newCustomers / data.customerInsights.totalCustomers) * 100) : 0}%)</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="w-2 h-2 rounded-full bg-violet-600"></span>
									<span>复购老客 ({data.customerInsights.repeatRatePercent}%)</span>
								</div>
							</div>
						</div>

						<!-- Revenue share insight callout -->
						<div class="rounded-xl bg-violet-50/60 border border-violet-100/80 px-3.5 py-2.5 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<UiIcon icon={RotateCcw} size={14} class="text-violet-600 shrink-0" />
								<p class="text-xs text-violet-900">
									老客复购贡献了全店 <strong class="font-mono font-bold text-violet-700">{data.customerInsights.repeatRevenuePercent}%</strong> 的总成交金额
								</p>
							</div>
							<a href="/admin/customers" class="text-xs font-semibold text-violet-700 hover:text-violet-900 shrink-0">
								画像 →
							</a>
						</div>
					</div>
				{/if}
			</div>

			<!-- Card Footer: Quick Link to Orders/Customers -->
			<div class="pt-4 mt-5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
				<span>累计交易：{data.totalOrdersCount} 笔订单 · {data.totalCustomersCount} 位客户</span>
				<a
					href={orderTab === 'orders' ? '/admin/orders' : '/admin/customers'}
					class="text-zinc-600 hover:text-zinc-900 font-medium flex items-center gap-0.5"
				>
					{orderTab === 'orders' ? '进入订单中心' : '查看客户列表'}
					<UiIcon icon={ArrowRight} size={11} />
				</a>
			</div>
		</section>
	</div>
</div>
