<script lang="ts">
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
			error = e instanceof Error ? e.message : 'Fulfillment failed';
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
			if (!res.ok) throw new Error(body.error || `Refund failed (${res.status})`);
			order = { ...order, status: body.order.status };
			refundOpen = false;
			refundAmount = '';
			refundReason = '';
			refundMode = 'full';
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Refund failed';
		} finally {
			refunding = false;
		}
	}
</script>

<svelte:head>
	<title>Order #{order.id.slice(0, 8)} | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-5xl">
	<!-- Back link -->
	<a
		href="/admin/orders"
		class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
	>
		<span class="material-symbols-outlined text-sm">arrow_back</span>
		Back to Orders
	</a>

	<!-- Header with Status and Actions -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
					Order #{order.id.slice(0, 8)}
				</h1>
				<span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border {statusBadge(order.status)}">
					{order.status}
				</span>
			</div>
			<p class="text-xs text-zinc-500 mt-1">Placed on {order.date} · {order.email}</p>
		</div>

		<div class="flex items-center gap-2.5">
			{#if canRefund}
				<button
					onclick={() => (refundOpen = true)}
					class="px-4 py-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold uppercase tracking-wider hover:bg-rose-100 transition-colors cursor-pointer"
				>
					Issue Refund
				</button>
			{/if}
			{#if canFulfill}
				<button
					onclick={() => (modalOpen = true)}
					class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">local_shipping</span>
					Mark as Shipped
				</button>
			{/if}
		</div>
	</div>

	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<span class="material-symbols-outlined text-base shrink-0">error</span>
			<span>{error}</span>
		</div>
	{/if}

	<!-- Order Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left: Purchased items -->
		<section class="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
			<div>
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-700 pb-4 mb-4 border-b border-zinc-100">
					Ordered Items ({order.items.length})
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
								<div class="w-14 h-16 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
									<span class="material-symbols-outlined text-lg">image</span>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<p class="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
								{#if item.variant}
									<p class="text-xs text-zinc-500 font-mono mt-0.5">{item.variant}</p>
								{/if}
								<p class="text-xs text-zinc-400 mt-1">Quantity: {item.quantity}</p>
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
					<span>Subtotal</span>
					<span class="font-medium text-zinc-800">{order.subtotal}</span>
				</div>
				<div class="flex justify-between text-zinc-500">
					<span>Estimated Shipping</span>
					<span class="font-medium text-zinc-800">{order.shipping}</span>
				</div>
				<div class="flex justify-between text-zinc-500">
					<span>Taxes & Duties</span>
					<span class="font-medium text-zinc-800">{order.tax}</span>
				</div>
				<div class="flex justify-between text-sm font-bold text-zinc-900 pt-3 border-t border-zinc-200">
					<span>Total Amount</span>
					<span>{order.total} {order.currency.toUpperCase()}</span>
				</div>
			</div>
		</section>

		<!-- Right: Customer & Shipping info -->
		<div class="space-y-6">
			<!-- Customer details -->
			<section class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-3">
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-700 pb-2 border-b border-zinc-100">
					Customer Information
				</h2>
				<div>
					<p class="text-sm font-semibold text-zinc-900">{order.name || 'Anonymous Shopper'}</p>
					<p class="text-xs text-zinc-500 break-all mt-0.5">{order.email}</p>
				</div>
				{#if order.address}
					<div class="pt-2 border-t border-zinc-100">
						<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Shipping Address</p>
						<p class="text-xs text-zinc-700 leading-relaxed">
							{order.address.line1}<br />
							{order.address.city}, {order.address.postalCode}<br />
							{order.address.country}
						</p>
					</div>
				{/if}
			</section>

			<!-- Fulfillment tracking -->
			<section class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-3">
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-700 pb-2 border-b border-zinc-100">
					Fulfillment & Logistics
				</h2>
				{#if order.trackingNumber}
					<div class="space-y-2">
						<div class="flex justify-between text-xs">
							<span class="text-zinc-400 uppercase font-semibold">Carrier</span>
							<span class="font-bold text-zinc-800 uppercase">{order.trackingCarrier}</span>
						</div>
						<div class="flex justify-between text-xs">
							<span class="text-zinc-400 uppercase font-semibold">Tracking #</span>
							<span class="font-mono font-semibold text-zinc-900 break-all">{order.trackingNumber}</span>
						</div>
					</div>
				{:else}
					<div class="py-4 text-center">
						<span class="material-symbols-outlined text-2xl text-zinc-300 block mb-1">pending</span>
						<p class="text-xs font-medium text-zinc-500">Order not shipped yet</p>
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>

<!-- Fulfillment modal -->
{#if modalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs px-4" role="dialog" aria-modal="true" aria-label="Mark as shipped">
		<div class="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
			<div>
				<h2 class="text-lg font-display font-bold uppercase tracking-wider text-zinc-900">Mark Order as Shipped</h2>
				<p class="text-xs text-zinc-500 mt-1">Provide carrier details and tracking number for customer updates</p>
			</div>

			<div>
				<label for="f-carrier" class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					Carrier *
				</label>
				<input
					id="f-carrier"
					bind:value={carrier}
					placeholder="e.g. UPS, FedEx, USPS, DHL"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
				/>
			</div>

			<div>
				<label for="f-tracking" class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					Tracking Number *
				</label>
				<input
					id="f-tracking"
					bind:value={trackingNumber}
					placeholder="e.g. 1Z9999999999999999"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
				/>
			</div>

			<div class="flex items-center gap-3 pt-2">
				<button
					type="button"
					onclick={() => (modalOpen = false)}
					class="flex-1 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 transition-colors cursor-pointer"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={submitFulfillment}
					disabled={saving || !carrier.trim() || !trackingNumber.trim()}
					class="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
				>
					{saving ? 'Saving…' : 'Confirm Shipment'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Refund modal -->
{#if refundOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs px-4" role="dialog" aria-modal="true" aria-label="Issue refund">
		<div class="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
			<div>
				<h2 class="text-lg font-display font-bold uppercase tracking-wider text-zinc-900">Issue Stripe Refund</h2>
				<p class="text-xs text-zinc-500 mt-1">Direct refund via Stripe API for this transaction</p>
			</div>

			<div class="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl">
				<button
					type="button"
					onclick={() => (refundMode = 'full')}
					class="py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer {refundMode === 'full'
						? 'bg-white text-zinc-900 shadow-xs'
						: 'text-zinc-600 hover:text-zinc-900'}"
				>
					Full Refund
				</button>
				<button
					type="button"
					onclick={() => (refundMode = 'partial')}
					class="py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer {refundMode === 'partial'
						? 'bg-white text-zinc-900 shadow-xs'
						: 'text-zinc-600 hover:text-zinc-900'}"
				>
					Partial Refund
				</button>
			</div>

			{#if refundMode === 'partial'}
				<div>
					<label for="ref-amount" class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						Amount to Refund ({order.currency.toUpperCase()}) *
					</label>
					<input
						id="ref-amount"
						bind:value={refundAmount}
						type="number"
						min="0"
						step="0.01"
						placeholder="e.g. 25.00"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</div>
			{/if}

			<div>
				<label for="ref-reason" class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					Refund Reason (Optional)
				</label>
				<input
					id="ref-reason"
					bind:value={refundReason}
					placeholder="e.g. Customer returned package, sizing mismatch"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
				/>
			</div>

			<div class="flex items-center gap-3 pt-2">
				<button
					type="button"
					onclick={() => (refundOpen = false)}
					class="flex-1 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 transition-colors cursor-pointer"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={submitRefund}
					disabled={refunding || (refundMode === 'partial' && !refundAmount)}
					class="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-rose-700 disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
				>
					{refunding ? 'Issuing…' : 'Confirm Refund'}
				</button>
			</div>
		</div>
	</div>
{/if}
