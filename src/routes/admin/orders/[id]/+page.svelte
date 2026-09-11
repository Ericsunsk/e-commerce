<script lang="ts">
	import { ArrowLeft, CircleAlert, Clock, Image as ImageIcon, Truck } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { getOrderStatusBadgeClass, getOrderStatusLabel } from '$domains/order';
	import { ADMIN_BUTTONS } from '$shared/kernel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let order = $state(data.order);
	let modalOpen = $state(false);
	// svelte-ignore state_referenced_locally
	let carrier = $state(order.trackingCarrier ?? '');
	// svelte-ignore state_referenced_locally
	let trackingNumber = $state(order.trackingNumber ?? '');
	let saving = $state(false);
	let error = $state('');

	// Refund modal state
	let refundOpen = $state(false);
	let refundMode = $state<'full' | 'partial'>('full');
	let refundAmount = $state('');
	let refundReason = $state('');
	let refunding = $state(false);

	const canFulfill = $derived(order.status === 'paid' || order.status === 'processing');
	const canRefund = $derived(
		order.status !== 'refunded' &&
			order.status !== 'partially_refunded' &&
			order.status !== 'cancelled' &&
			order.status !== 'pending'
	);

	async function submitFulfillment() {
		saving = true;
		error = '';
		try {
			const res = await fetch(`/api/admin/orders/${order.id}/fulfill`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ carrier, trackingNumber })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || `Fulfillment failed (${res.status})`);
			}
			const result = await res.json();
			order = {
				...order,
				status: result.order.status,
				trackingCarrier: result.order.trackingCarrier,
				trackingNumber: result.order.trackingNumber
			};
			modalOpen = false;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '发货失败';
		} finally {
			saving = false;
		}
	}

	async function submitRefund() {
		refunding = true;
		error = '';
		try {
			const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...(refundMode === 'partial' ? { amount: Number(refundAmount) } : {}),
					...(refundReason.trim() ? { reason: refundReason.trim() } : {})
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `退款失败 (${res.status})`);
			order = { ...order, status: body.order.status };
			refundOpen = false;
			refundAmount = '';
			refundReason = '';
			refundMode = 'full';
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '退款失败';
		} finally {
			refunding = false;
		}
	}
</script>

<svelte:head>
	<title>订单 #{order.id.slice(0, 8)} | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-5xl">
	<!-- Back link -->
	<a
		href="/admin/orders"
		class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
	>
		<UiIcon icon={ArrowLeft} size={14} />
		返回订单列表
	</a>

	<!-- Header with Status and Actions -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
					订单 #{order.id.slice(0, 8)}
				</h1>
				<span
					class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border {getOrderStatusBadgeClass(
						order.status
					)}"
				>
					{getOrderStatusLabel(order.status)}
				</span>
			</div>
			<p class="text-xs text-zinc-500 mt-1">下单于 {order.date} · {order.email}</p>
		</div>

		<div class="flex items-center gap-2.5">
			{#if canRefund}
				<button
					onclick={() => (refundOpen = true)}
					class={ADMIN_BUTTONS.dangerSecondary}
				>
					发起退款
				</button>
			{/if}
			{#if canFulfill}
				<button
					onclick={() => (modalOpen = true)}
					class={ADMIN_BUTTONS.primary}
				>
					<UiIcon icon={Truck} size={16} />
					标记发货
				</button>
			{/if}
		</div>
	</div>

	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<UiIcon icon={CircleAlert} size={16} class="shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Order Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left: Purchased items -->
		<section
			class="lg:col-span-2 bg-white border border-zinc-200 rounded-card p-6 flex flex-col justify-between"
		>
			<div>
				<h2
					class="text-xs font-bold uppercase tracking-wider text-zinc-700 pb-4 mb-4 border-b border-zinc-100"
				>
					购买商品 ({order.items.length})
				</h2>
				<div class="divide-y divide-zinc-100">
					{#each order.items as item (item.id)}
						<div class="flex items-center gap-4 py-3.5">
							{#if item.image}
								<img
									src={item.image}
									alt=""
									class="w-14 h-16 object-cover rounded-lg border border-zinc-200 shrink-0 bg-zinc-100"
									loading="lazy"
								/>
							{:else}
								<div
									class="w-14 h-16 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0"
								>
									<UiIcon icon={ImageIcon} size={18} />
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<p class="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
								{#if item.variant}
									<p class="text-xs text-zinc-500 font-mono mt-0.5">{item.variant}</p>
								{/if}
								<p class="text-xs text-zinc-400 mt-1">数量：{item.quantity}</p>
							</div>
							<div class="text-right shrink-0">
								<p class="text-sm font-bold text-zinc-900">{item.price}</p>
								<p class="text-xs text-zinc-400 font-mono">× {item.quantity}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Price Breakdown -->
			<div class="pt-6 mt-6 border-t border-zinc-100 space-y-2 text-xs">
				<div class="flex justify-between text-zinc-500">
					<span>小计</span>
					<span class="font-medium text-zinc-800">{order.subtotal}</span>
				</div>
				<div class="flex justify-between text-zinc-500">
					<span>预估运费</span>
					<span class="font-medium text-zinc-800">{order.shipping}</span>
				</div>
				<div class="flex justify-between text-zinc-500">
					<span>税费</span>
					<span class="font-medium text-zinc-800">{order.tax}</span>
				</div>
				<div
					class="flex justify-between text-sm font-bold text-zinc-900 pt-3 border-t border-zinc-200"
				>
					<span>总金额</span>
					<span>{order.total} {order.currency.toUpperCase()}</span>
				</div>
			</div>
		</section>

		<!-- Right: Customer & Shipping info -->
		<div class="space-y-6">
			<!-- Customer details -->
			<section class="bg-white border border-zinc-200 rounded-card p-6 space-y-3">
				<h2
					class="text-xs font-bold uppercase tracking-wider text-zinc-700 pb-2 border-b border-zinc-100"
				>
					客户信息
				</h2>
				<div>
					<p class="text-sm font-semibold text-zinc-900">{order.name || '匿名顾客'}</p>
					<p class="text-xs text-zinc-500 break-all mt-0.5">{order.email}</p>
				</div>
				{#if order.address}
					<div class="pt-2 border-t border-zinc-100">
						<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
							收货地址
						</p>
						<p class="text-xs text-zinc-700 leading-relaxed">
							{order.address.line1}<br />
							{order.address.city}, {order.address.postalCode}<br />
							{order.address.country}
						</p>
					</div>
				{/if}
			</section>

			<!-- Fulfillment tracking -->
			<section class="bg-white border border-zinc-200 rounded-card p-6 space-y-3">
				<h2
					class="text-xs font-bold uppercase tracking-wider text-zinc-700 pb-2 border-b border-zinc-100"
				>
					发货与物流
				</h2>
				{#if order.trackingNumber}
					<div class="space-y-2">
						<div class="flex justify-between text-xs">
							<span class="text-zinc-400 uppercase font-semibold">承运商</span>
							<span class="font-bold text-zinc-800 uppercase">{order.trackingCarrier}</span>
						</div>
						<div class="flex justify-between text-xs">
							<span class="text-zinc-400 uppercase font-semibold">运单号</span>
							<span class="font-mono font-semibold text-zinc-900 break-all"
								>{order.trackingNumber}</span
							>
						</div>
					</div>
				{:else}
					<div class="py-4 text-center">
						<UiIcon icon={Clock} size={24} class="text-zinc-300 block mb-1 mx-auto" />
						<p class="text-xs font-medium text-zinc-500">订单尚未发货</p>
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>

<!-- Fulfillment modal -->
{#if modalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs px-4"
		role="dialog"
		aria-modal="true"
		aria-label="标记发货"
	>
		<div
			class="w-full max-w-md bg-white border border-zinc-200 rounded-card shadow-xl p-6 sm:p-8 space-y-5"
		>
			<div>
				<h2 class="text-lg font-display font-bold uppercase tracking-wider text-zinc-900">
					标记为已发货
				</h2>
				<p class="text-xs text-zinc-500 mt-1">填写承运商与运单号，客户将收到更新</p>
			</div>

			<div>
				<label
					for="f-carrier"
					class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
				>
					承运商 *
				</label>
				<input
					id="f-carrier"
					bind:value={carrier}
					placeholder="例如：顺丰、京东、中通、UPS"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
				/>
			</div>

			<div>
				<label
					for="f-tracking"
					class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
				>
					运单号 *
				</label>
				<input
					id="f-tracking"
					bind:value={trackingNumber}
					placeholder="例如：SF1234567890"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
				/>
			</div>

			<div class="flex items-center gap-3 pt-2">
				<button
					type="button"
					onclick={() => (modalOpen = false)}
					class="flex-1 {ADMIN_BUTTONS.secondary}"
				>
					取消
				</button>
				<button
					type="button"
					onclick={submitFulfillment}
					disabled={saving || !carrier.trim() || !trackingNumber.trim()}
					class="flex-1 {ADMIN_BUTTONS.primary}"
				>
					{saving ? '保存中…' : '确认发货'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Refund modal -->
{#if refundOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs px-4"
		role="dialog"
		aria-modal="true"
		aria-label="发起退款"
	>
		<div
			class="w-full max-w-md bg-white border border-zinc-200 rounded-card shadow-xl p-6 sm:p-8 space-y-5"
		>
			<div>
				<h2 class="text-lg font-display font-bold uppercase tracking-wider text-zinc-900">
					发起 Stripe 退款
				</h2>
				<p class="text-xs text-zinc-500 mt-1">直接通过 Stripe API 退回该笔交易</p>
			</div>

			<div class="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-card">
				<button
					type="button"
					onclick={() => (refundMode = 'full')}
					class="py-2 rounded-card-inner text-xs font-bold uppercase tracking-wider transition-all cursor-pointer {refundMode ===
					'full'
						? 'bg-white text-zinc-900 shadow-xs'
						: 'text-zinc-600 hover:text-zinc-900'}"
				>
					全额退款
				</button>
				<button
					type="button"
					onclick={() => (refundMode = 'partial')}
					class="py-2 rounded-card-inner text-xs font-bold uppercase tracking-wider transition-all cursor-pointer {refundMode ===
					'partial'
						? 'bg-white text-zinc-900 shadow-xs'
						: 'text-zinc-600 hover:text-zinc-900'}"
				>
					部分退款
				</button>
			</div>

			{#if refundMode === 'partial'}
				<div>
					<label
						for="ref-amount"
						class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
					>
						退款金额 ({order.currency.toUpperCase()}) *
					</label>
					<input
						id="ref-amount"
						bind:value={refundAmount}
						type="number"
						min="0"
						step="0.01"
						placeholder="例如：25.00"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</div>
			{/if}

			<div>
				<label
					for="ref-reason"
					class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
				>
					退款原因（选填）
				</label>
				<input
					id="ref-reason"
					bind:value={refundReason}
					placeholder="例如：客户退货、尺码不合适"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
				/>
			</div>

			<div class="flex items-center gap-3 pt-2">
				<button
					type="button"
					onclick={() => (refundOpen = false)}
					class="flex-1 {ADMIN_BUTTONS.secondary}"
				>
					取消
				</button>
				<button
					type="button"
					onclick={submitRefund}
					disabled={refunding || (refundMode === 'partial' && !refundAmount)}
					class="flex-1 {ADMIN_BUTTONS.dangerSolid}"
				>
					{refunding ? '退款中…' : '确认退款'}
				</button>
			</div>
		</div>
	</div>
{/if}
