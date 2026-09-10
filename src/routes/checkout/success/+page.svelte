<script lang="ts">
	import { CircleCheck } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { onMount } from 'svelte';
	import { useCart } from '$domains/cart';
	import { fade } from 'svelte/transition';
	import { DEFAULTS } from '$shared/kernel';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const cart = useCart();

	onMount(() => {
		// Clear cart on successful order
		cart.clear();
	});
</script>

<svelte:head>
	<title>Thank You | {DEFAULTS.siteName}</title>
</svelte:head>

<div
	class="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-6 pt-20"
>
	<div in:fade={{ duration: 800 }} class="max-w-md w-full text-center">
		<UiIcon icon={CircleCheck} size={60} class="mb-8 text-primary dark:text-white opacity-20" />

		<h1
			class="text-3xl md:text-4xl font-display uppercase tracking-widest mb-6 text-primary dark:text-white"
		>
			Thank You For Your Order
		</h1>

		<p
			class="text-xs uppercase tracking-[0.2em] leading-relaxed text-primary/60 dark:text-white/60 mb-12"
		>
			Your order has been received and is being processed. A confirmation email will be sent to you
			shortly.
		</p>

		{#if data.reconciled?.orderId}
			<p class="text-[10px] uppercase tracking-[0.2em] text-primary/40 dark:text-white/40 mb-12">
				Order {data.reconciled.orderId} confirmed
			</p>
		{/if}

		<div class="flex flex-col gap-4">
			<a
				href="/shop"
				class="w-full h-14 border border-primary dark:border-white text-primary dark:text-white flex items-center justify-center text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all"
			>
				Continue Shopping
			</a>
			<a
				href="/account"
				class="w-full h-14 bg-primary text-white dark:bg-white dark:text-primary flex items-center justify-center text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
			>
				View My Account
			</a>
		</div>

		<div class="mt-16 pt-8 border-t border-primary/10 dark:border-white/10">
			<p
				class="text-[10px] text-primary/40 dark:text-white/40 uppercase tracking-widest font-medium"
			>
				Questions? Email us at assistance@{DEFAULTS.siteName.toLowerCase()}.com
			</p>
		</div>
	</div>
</div>
