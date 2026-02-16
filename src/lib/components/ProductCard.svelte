<script lang="ts">
	import { useCart } from '$lib/stores/cart.svelte';
	import { useWishlist } from '$lib/stores/wishlist.svelte';
	import { TRANSITIONS } from '$lib/constants';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MESSAGES } from '$lib/messages';
	import CoverImageLayer from './ui/CoverImageLayer.svelte';
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
	let linkHref = $derived(href || `/shop/${product.id}`);

	function quickAdd() {
		if (product.hasVariants && product.variants && product.variants.length > 0) {
			const preferred =
				product.variants.find((v) => (v.stockQuantity || 0) > 0) ?? product.variants[0];
			cart.addItem(product, preferred.color, preferred.size);
		} else {
			cart.addItem(product, 'Standard', 'Generic');
		}
		toastStore.success(MESSAGES.SUCCESS.ADDED_TO_BAG(product.title));
	}
</script>

<div class="group flex flex-col gap-4 product-card h-full">
	<CoverImageLayer
		src={product.image}
		alt={product.title}
		containerClass="relative overflow-hidden bg-primary/5 dark:bg-white/5 product-image-container {isFeature
			? 'aspect-[16/10]'
			: 'aspect-[3/4]'}"
		imageClassName="w-full h-full absolute inset-0 group-hover:scale-105 {TRANSITIONS.transform} ease-apple-spring"
		overlayClassName="absolute inset-0 bg-black/0 group-hover:bg-black/5 {TRANSITIONS.colors} pointer-events-none"
	>
		<a
			href={linkHref}
			data-sveltekit-preload-data="hover"
			aria-label={`View ${product.title}`}
			class="absolute inset-0 z-10"
		></a>

		{#if isFeature && product.tag}
			<Badge variant="accent" className="absolute top-4 left-4 z-[var(--z-overlay-content)]">
				{product.tag}
			</Badge>
		{/if}

		<button
			class="group/btn absolute top-2 right-2 z-20 p-2 text-white mix-blend-difference cursor-pointer opacity-0 group-hover:opacity-100 {TRANSITIONS.opacity}"
			type="button"
			onclick={() => {
				wishlist.toggle(product);
			}}
			aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
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
			class="absolute bottom-4 left-0 right-0 z-20 flex justify-center opacity-0 group-hover:opacity-100 {TRANSITIONS.opacity} pointer-events-none"
		>
			<button
				type="button"
				onclick={quickAdd}
				class="bg-white/90 dark:bg-black/80 backdrop-blur text-primary dark:text-white text-xs font-bold py-2 px-6 uppercase tracking-wider hover:bg-white dark:hover:bg-black shadow-lg cursor-pointer hover:scale-105 {TRANSITIONS.transform} pointer-events-auto"
			>
				Quick Add
			</button>
		</div>
	</CoverImageLayer>
	<div class="flex flex-col items-center text-center gap-1 pt-2">
		<a
			href={linkHref}
			data-sveltekit-preload-data="hover"
			class="text-sm font-semibold tracking-wide text-primary dark:text-white uppercase"
		>
			{product.title}
		</a>
		<p class="text-xs text-primary/60 dark:text-white/60 font-medium tracking-wider">
			{product.price}
		</p>
	</div>
</div>
