<script lang="ts">
	import { useCart } from '$lib/stores/cart.svelte';
	import { useWishlist } from '$lib/stores/wishlist.svelte';
	import { TRANSITIONS } from '$lib/constants';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MESSAGES } from '$lib/messages';
	import RemoteImage from './ui/RemoteImage.svelte';
	import Badge from './ui/Badge.svelte';

	const cart = useCart();
	const wishlist = useWishlist();

	import type { Product } from '$lib/types';

	interface Props {
		product: Product;
		isFeature?: boolean;
		href?: string;
	}

	let { product, isFeature = false, href = '' }: Props = $props();
	let inWishlist = $derived(wishlist.has(product.id));

	function quickAdd(e: MouseEvent) {
		e.preventDefault(); // Prevent navigation to product page
		e.stopPropagation();
		cart.addItem(product, 'Standard', 'Generic');
		toastStore.success(MESSAGES.SUCCESS.ADDED_TO_BAG(product.title));
	}
</script>

<a
	{href}
	data-sveltekit-preload-data="hover"
	class="group cursor-pointer flex flex-col gap-4 product-card h-full block"
>
	<div
		class="relative overflow-hidden bg-primary/5 dark:bg-white/5 product-image-container {isFeature
			? 'aspect-[16/10]'
			: 'aspect-[3/4]'}"
	>
		{#if isFeature && product.tag}
			<Badge variant="accent" className="absolute top-4 left-4 z-[var(--z-overlay-content)]">
				{product.tag}
			</Badge>
		{/if}

		<RemoteImage
			src={product.image}
			alt={product.title}
			className="w-full h-full absolute inset-0 group-hover:scale-105 {TRANSITIONS.transform} ease-apple-spring"
		/>

		<button
			class="group/btn absolute top-2 right-2 z-20 p-2 text-white mix-blend-difference cursor-pointer opacity-0 group-hover:opacity-100 {TRANSITIONS.opacity}"
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				wishlist.toggle(product);
			}}
			aria-label="Add to wishlist"
		>
			<span
				class="material-symbols-outlined text-[20px] drop-shadow-md {inWishlist
					? "[font-variation-settings:'FILL'_1]"
					: "[font-variation-settings:'FILL'_0]"}"
			>
				favorite
			</span>
		</button>

		<div
			class="absolute inset-0 bg-black/0 group-hover:bg-black/5 {TRANSITIONS.colors} pointer-events-none"
		></div>
		<div
			class="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 {TRANSITIONS.opacity} pointer-events-none"
		>
			<button
				onclick={quickAdd}
				class="bg-white/90 dark:bg-black/80 backdrop-blur text-primary dark:text-white text-xs font-bold py-2 px-6 uppercase tracking-wider hover:bg-white dark:hover:bg-black shadow-lg cursor-pointer hover:scale-105 {TRANSITIONS.transform} pointer-events-auto"
			>
				Quick Add
			</button>
		</div>
	</div>
	<div class="flex flex-col items-center text-center gap-1 pt-2">
		<h3 class="text-sm font-semibold tracking-wide text-primary dark:text-white uppercase">
			{product.title}
		</h3>
		<p class="text-xs text-primary/60 dark:text-white/60 font-medium tracking-wider">
			{product.price}
		</p>
	</div>
</a>
