<script lang="ts">
	import { TRANSITIONS, MESSAGES } from '$shared/kernel';
	import { Heart } from 'lucide-svelte';
	import { toastStore, Badge, UiIcon } from '$shared/ui';
	import { CoverImageLayer } from '$shared/ui';
	import { getCompareAtPrice, getDiscountPercent } from '../domain/pricing';
	import { formatCurrency } from '$shared/kernel';
	import type { Product } from '../domain/models';

	/**
	 * Cart and wishlist are injected rather than imported from `$domains/cart`
	 * and `$domains/customer`. Catalog owns how a product is *presented*; it does
	 * not own the bag or the wishlist. Importing those contexts here made a
	 * presentational component depend on two others' state, producing a
	 * catalog -> cart -> customer -> catalog cycle (Constitution Principle IX).
	 * Callers that already sit at the seam pass the behaviour in.
	 */
	interface Props {
		product: Product;
		isFeature?: boolean;
		href?: string;
		/** Add to bag. Omit to hide Quick Add. */
		onAddToBag?: (product: Product) => void;
		/** Wishlist state + toggle. Omit to hide the heart. */
		wishlist?: { has: (id: string) => boolean; toggle: (product: Product) => void };
		/** Currency for the compare-at price. */
		currencyCode?: string;
	}

	let {
		product,
		isFeature = false,
		href = '',
		onAddToBag,
		wishlist,
		currencyCode = 'USD'
	}: Props = $props();

	let inWishlist = $derived(wishlist?.has(product.id) ?? false);
	let linkHref = $derived(href || `/shop/${product.id}`);
	let discountPercent = $derived(getDiscountPercent(product));
	let compareAtPrice = $derived(getCompareAtPrice(product));

	function quickAdd() {
		if (!onAddToBag) return;
		onAddToBag(product);
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

		{#if discountPercent !== null}
			<Badge
				variant="accent"
				className="absolute top-4 right-4 z-[var(--z-overlay-content)] bg-red-600 text-white border-red-600"
			>
				-{discountPercent}% OFF
			</Badge>
		{/if}

		{#if wishlist}
			<button
				class="group/btn absolute top-2 right-2 z-20 p-2 text-white mix-blend-difference cursor-pointer opacity-0 group-hover:opacity-100 {TRANSITIONS.opacity}"
				type="button"
				onclick={() => wishlist.toggle(product)}
				aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
			>
				<UiIcon
					icon={Heart}
					size={20}
					class="drop-shadow-md"
					fill={inWishlist ? 'currentColor' : 'none'}
				/>
			</button>
		{/if}

		{#if onAddToBag}
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
		{/if}
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
			{#if compareAtPrice !== null}
				<span class="line-through opacity-70 ml-1.5">
					{formatCurrency(compareAtPrice, { currency: currencyCode, locale: 'en-US' })}
				</span>
			{/if}
		</p>
	</div>
</div>
