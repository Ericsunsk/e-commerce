<script lang="ts">
	import type { OrderDetail } from '$lib/types';
	import { CheckCircle, Truck, XCircle, Clock } from 'lucide-svelte';
	import { parsePocketBaseDate } from '$lib/utils/date';

	let { order } = $props<{ order: OrderDetail }>();

	// Formatters
	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	const safeDate = $derived.by(() => parsePocketBaseDate(order.date));

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

<div class="border-t border-b border-primary dark:border-white py-12 mb-12">
	<div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-12">
		<!-- Main Header -->
		<div>
			<div class="flex items-center gap-4 mb-4">
				<h1
					class="font-display text-4xl text-text-main dark:text-white uppercase tracking-[0.05em]"
				>
					Order #{order.id.slice(-8).toUpperCase()}
				</h1>
				<div
					class="flex items-center gap-2 px-3 py-1 border border-neutral-200 dark:border-neutral-800"
				>
					<Icon size={14} class={iconClass} />
					<span class="font-mono text-xs uppercase text-text-main dark:text-white">
						{order.status}
					</span>
				</div>
			</div>

			<p class="font-sans text-xs uppercase tracking-[0.2em] text-neutral-500">
				Placed on {safeDate ? dateFormatter.format(safeDate) : 'Unknown'}
			</p>
		</div>

		<!-- Addresses -->
		<div class="grid grid-cols-1 gap-8 min-w-0 md:min-w-[300px]">
			<div>
				<h3 class="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-4">
					Shipping Address
				</h3>
				<div class="text-sm text-text-main dark:text-white leading-relaxed font-sans">
					<p class="font-medium uppercase tracking-wide">{order.shippingAddress.name}</p>
					<p>{order.shippingAddress.line1}</p>
					{#if order.shippingAddress.line2}<p>{order.shippingAddress.line2}</p>{/if}
					<p>
						{order.shippingAddress.city}
						{#if order.shippingAddress.state}, {order.shippingAddress.state}{/if}
						{#if order.shippingAddress.postalCode}
							{order.shippingAddress.postalCode}{/if}
					</p>
					<p>{order.shippingAddress.country}</p>
				</div>
			</div>

			{#if order.tracking}
				<div class="pt-6 border-t border-dashed border-neutral-200 dark:border-neutral-800">
					<h3 class="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-4">
						Tracking
					</h3>
					<div class="flex justify-between items-center text-sm">
						<span class="text-text-main dark:text-white">{order.tracking.carrier}</span>
						<span class="font-mono text-neutral-500">{order.tracking.number}</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
