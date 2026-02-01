<script lang="ts">
	import type { OrderDetail } from '$lib/types';
	import { CheckCircle, Truck, XCircle, Clock } from 'lucide-svelte';

	let { order } = $props<{ order: OrderDetail }>();

	// Formatters
	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	function getStatusIcon(status: string) {
		switch (status) {
			case 'paid':
			case 'delivered':
				return CheckCircle;
			case 'shipped':
				return Truck;
			case 'cancelled':
			case 'refunded':
				return XCircle;
			default:
				return Clock;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'paid':
			case 'delivered':
				return 'text-emerald-600 dark:text-emerald-400';
			case 'shipped':
			case 'processing':
				return 'text-blue-600 dark:text-blue-400';
			case 'cancelled':
			case 'refunded':
				return 'text-red-600 dark:text-red-400';
			default:
				return 'text-neutral-600 dark:text-neutral-400';
		}
	}

	let Icon = $derived(getStatusIcon(order.status));
	let iconClass = $derived(getStatusColor(order.status));
</script>

<div
	class="bg-neutral-50 dark:bg-neutral-900/50 p-6 md:p-8 rounded-xl border border-neutral-100 dark:border-neutral-800 mb-8"
>
	<div class="flex flex-col md:flex-row justify-between md:items-start gap-6">
		<div>
			<h1 class="font-display text-2xl md:text-3xl text-text-main dark:text-white mb-2">
				Order #{order.id.slice(-6).toUpperCase()}
			</h1>
			<p class="text-neutral-500 dark:text-neutral-400 font-sans text-sm">
				Placed on {dateFormatter.format(new Date(order.date))}
			</p>
		</div>

		<div
			class="flex items-center gap-3 bg-white dark:bg-black px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm"
		>
			<Icon size={20} class={iconClass} />
			<span
				class="font-sans font-medium uppercase tracking-wider text-sm text-text-main dark:text-white"
			>
				{order.status}
			</span>
		</div>
	</div>

	<!-- Shipping & Tracking -->
	<div
		class="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-8"
	>
		<div>
			<h3 class="text-xs font-sans font-medium tracking-widest uppercase text-neutral-500 mb-3">
				Shipping Address
			</h3>
			<div class="text-sm text-text-main dark:text-white leading-relaxed">
				<p class="font-medium">{order.shippingAddress.name}</p>
				<p>{order.shippingAddress.line1}</p>
				{#if order.shippingAddress.line2}<p>{order.shippingAddress.line2}</p>{/if}
				<p>
					{order.shippingAddress.city}, {order.shippingAddress.state || ''}
					{order.shippingAddress.postalCode}
				</p>
				<p>{order.shippingAddress.country}</p>
			</div>
		</div>

		{#if order.tracking}
			<div>
				<h3 class="text-xs font-sans font-medium tracking-widest uppercase text-neutral-500 mb-3">
					Tracking Info
				</h3>
				<div class="text-sm text-text-main dark:text-white leading-relaxed">
					<p><span class="text-neutral-500">Carrier:</span> {order.tracking.carrier}</p>
					<p>
						<span class="text-neutral-500">Number:</span>
						<span class="font-mono">{order.tracking.number}</span>
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>
