<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	// Intentional snapshot: the detail becomes client-owned state after fulfillment.
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
	<title>Order {order.id.slice(0, 8)} | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<a href="/admin/orders" class="text-[11px] uppercase tracking-widest text-white/50 hover:text-white">
	← Back to Orders
</a>

<div class="flex flex-wrap items-center justify-between gap-4 mt-4 mb-8">
	<div>
		<h1 class="text-2xl font-display uppercase tracking-widest">Order {order.id.slice(0, 8)}…</h1>
		<p class="text-xs text-white/40 mt-1">{order.date} · {order.email}</p>
	</div>
	<div class="flex items-center gap-3">
		<span class="px-3 py-1 text-[10px] uppercase tracking-widest bg-white/10">{order.status}</span>
		{#if canRefund}
			<button
				onclick={() => (refundOpen = true)}
				class="px-5 py-3 border border-red-400/50 text-red-300 text-[11px] font-bold uppercase tracking-widest hover:bg-red-400/10"
			>
				Issue Refund
			</button>
		{/if}
		{#if canFulfill}
			<button
				onclick={() => (modalOpen = true)}
				class="px-5 py-3 bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:opacity-90"
			>
				Mark as Shipped
			</button>
		{/if}
	</div>
</div>

{#if error}
	<p role="alert" class="text-xs uppercase tracking-widest text-red-400 mb-4">{error}</p>
{/if}

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	<!-- Items -->
	<section class="lg:col-span-2 border border-white/10 p-6">
		<h2 class="text-xs uppercase tracking-[0.2em] text-white/50 mb-4">Items</h2>
		{#each order.items as item (item.id)}
			<div class="flex gap-4 py-3 border-b border-white/5 last:border-0">
				{#if item.image}
					<img src={item.image} alt="" class="w-12 h-16 object-cover" loading="lazy" />
				{/if}
				<div class="flex-1">
					<p class="text-sm">{item.title}</p>
					{#if item.variant}
						<p class="text-[10px] text-white/40">{item.variant}</p>
					{/if}
					<p class="text-[10px] text-white/40">Qty {item.quantity}</p>
				</div>
				<p class="text-sm">{item.price} × {item.quantity}</p>
			</div>
		{/each}
		<div class="mt-4 space-y-1 text-sm text-right">
			<p class="text-white/60">Subtotal {order.subtotal}</p>
			<p class="text-white/60">Shipping {order.shipping} · Tax {order.tax}</p>
			<p class="text-lg">Total {order.total} {order.currency.toUpperCase()}</p>
		</div>
	</section>

	<!-- Customer + fulfillment -->
	<section class="border border-white/10 p-6 space-y-4 h-fit">
		<h2 class="text-xs uppercase tracking-[0.2em] text-white/50">Customer</h2>
		<p class="text-sm">{order.name || '—'}</p>
		<p class="text-sm text-white/60 break-all">{order.email}</p>
		{#if order.address}
			<p class="text-xs text-white/60">
				{order.address.line1}, {order.address.city}
				{order.address.postalCode}, {order.address.country}
			</p>
		{/if}
		<h2 class="text-xs uppercase tracking-[0.2em] text-white/50 pt-2">Fulfillment</h2>
		{#if order.trackingNumber}
			<p class="text-sm"><span class="text-white/50">Carrier:</span> {order.trackingCarrier}</p>
			<p class="text-sm font-mono break-all">
				<span class="text-white/50 font-sans">Tracking:</span>
				{order.trackingNumber}
			</p>
		{:else}
			<p class="text-xs text-white/40">Not shipped yet</p>
		{/if}
	</section>
</div>

<!-- Fulfillment modal -->
{#if modalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" role="dialog" aria-modal="true" aria-label="Mark as shipped">
		<div class="w-full max-w-md bg-neutral-950 border border-white/15 p-8">
			<h2 class="text-xl font-display uppercase tracking-widest mb-6">Mark as Shipped</h2>
			<label class="block mb-4">
				<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Carrier</span>
				<input
					bind:value={carrier}
					placeholder="UPS / FedEx / DHL"
					class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
				/>
			</label>
			<label class="block mb-8">
				<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">
					Tracking number
				</span>
				<input
					bind:value={trackingNumber}
					placeholder="1Z…"
					class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm font-mono outline-none focus:border-white"
				/>
			</label>
			<div class="flex gap-3">
				<button
					onclick={() => (modalOpen = false)}
					class="flex-1 border border-white/20 py-3 text-[11px] uppercase tracking-widest hover:bg-white/5"
				>
					Cancel
				</button>
				<button
					onclick={submitFulfillment}
					disabled={saving || !carrier.trim() || !trackingNumber.trim()}
					class="flex-1 bg-white text-black py-3 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Confirm'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Refund modal -->
{#if refundOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" role="dialog" aria-modal="true" aria-label="Issue refund">
		<div class="w-full max-w-md bg-neutral-950 border border-white/15 p-8">
			<h2 class="text-xl font-display uppercase tracking-widest mb-6">Issue Refund</h2>

			<div class="grid grid-cols-2 gap-3 mb-4">
				<button
					onclick={() => (refundMode = 'full')}
					class="py-3 text-[11px] uppercase tracking-widest border {refundMode === 'full'
						? 'bg-white text-black border-white'
						: 'border-white/20 text-white/60'}"
				>
					Full
				</button>
				<button
					onclick={() => (refundMode = 'partial')}
					class="py-3 text-[11px] uppercase tracking-widest border {refundMode === 'partial'
						? 'bg-white text-black border-white'
						: 'border-white/20 text-white/60'}"
				>
					Partial
				</button>
			</div>

			{#if refundMode === 'partial'}
				<label class="block mb-4">
					<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">
						Amount ({order.currency.toUpperCase()})
					</span>
					<input
						bind:value={refundAmount}
						type="number"
						min="0"
						step="0.01"
						placeholder="10.00"
						class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
					/>
				</label>
			{/if}

			<label class="block mb-8">
				<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">
					Reason (optional)
				</span>
				<input
					bind:value={refundReason}
					placeholder="Customer return…"
					class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
				/>
			</label>

			<div class="flex gap-3">
				<button
					onclick={() => (refundOpen = false)}
					class="flex-1 border border-white/20 py-3 text-[11px] uppercase tracking-widest hover:bg-white/5"
				>
					Cancel
				</button>
				<button
					onclick={submitRefund}
					disabled={refunding || (refundMode === 'partial' && !refundAmount)}
					class="flex-1 bg-red-500 text-white py-3 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
				>
					{refunding ? 'Issuing…' : 'Issue Refund'}
				</button>
			</div>
		</div>
	</div>
{/if}
