<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MESSAGES } from '$lib/messages';
	import { useCart } from '$lib/stores/cart.svelte';
	import { useWishlist } from '$lib/stores/wishlist.svelte';

	const cart = useCart();
	const wishlist = useWishlist();

	let { data } = $props();

	// Derive colors and sizes from variants (new schema)
	let derivedColors = $derived.by(() => {
		const variants = data.product.variants ?? [];
		const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
		// Fallback to attributes or default
		if (colors.length === 0) {
			const attrColors = data.product.attributes?.colors;
			return Array.isArray(attrColors) ? attrColors : ['Black'];
		}
		return colors as string[];
	});

	let derivedSizes = $derived.by(() => {
		const variants = data.product.variants ?? [];
		const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
		// Fallback to attributes or default
		if (sizes.length === 0) {
			const attrSizes = data.product.attributes?.sizes;
			return Array.isArray(attrSizes) ? attrSizes : ['S', 'M', 'L', 'XL'];
		}
		return sizes as string[];
	});

	// Derive material/details/shipping from attributes
	let material = $derived((data.product.attributes?.material as string) ?? '');
	let details = $derived((data.product.attributes?.details as string[]) ?? []);
	let shipping = $derived((data.product.attributes?.shipping as string) ?? '');

	let product = $derived(
		data.product
			? {
					...data.product,
					image: data.product.image,
					images: data.product.images ?? [data.product.image],
					colors: derivedColors,
					sizes: derivedSizes,
					material,
					details,
					shipping
				}
			: null
	);
	let relatedProducts = $derived(data.related);

	let selectedSize = $state('');
	let selectedColor = $state(''); // Will be set by $effect on mount

	// UI States
	let isAdding = $state(false);
	let sizeError = $state(false);

	// Reset state when product changes (client-side navigation)
	$effect(() => {
		if (product) {
			selectedColor = product.colors?.[0] ?? 'Black';
			selectedSize = '';
			sizeError = false;
			isAdding = false;
		}
	});

	function addToBag() {
		if (!product || !selectedSize) {
			sizeError = true;
			// Removed redundant toast, visual shake is enough
			setTimeout(() => (sizeError = false), 1000);
			return;
		}

		isAdding = true;
		// Simulate network delay for UX
		setTimeout(() => {
			if (product) {
				cart.addItem(product, selectedColor, selectedSize);
				toastStore.success(MESSAGES.SUCCESS.ADDED_TO_BAG(product.title));
				isAdding = false;
			}
		}, 500);
	}
</script>

<svelte:head>
	{#if product}
		<title>{product.title} | {data.settings.siteName}</title>
		<meta name="description" content={product.description} />
		<meta property="og:image" content={product.image} />
	{/if}
</svelte:head>

{#if !product}
	<div
		class="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark"
	>
		<div
			class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
		></div>
	</div>
{:else}
	<div
		class="max-w-[1800px] mx-auto pt-24 pb-20 bg-background-light dark:bg-background-dark min-h-screen"
	>
		<div class="lg:flex lg:gap-12 xl:gap-24">
			<!-- Left Column: Vertical Gallery -->
			<div class="lg:w-[60%] xl:w-[65%] flex flex-col gap-1">
				<!-- Mobile: Horizontal Scroll Snap -->
				<div class="flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-1 scrollbar-hide">
					{#each product.images as image, i (image)}
						<div class="shrink-0 w-full snap-center">
							<div class="aspect-[3/4] w-full relative">
								<RemoteImage
									src={image}
									alt="{product.title} view {i + 1}"
									className="w-full h-full object-cover"
									priority={i === 0}
								/>
							</div>
						</div>
					{/each}
				</div>

				<!-- Desktop: Vertical Stack -->
				<div class="hidden lg:flex flex-col gap-1 w-full pl-6 md:pl-12">
					{#each product.images as image, i (image)}
						<div class="w-full relative">
							<RemoteImage
								src={image}
								alt="{product.title} view {i + 1}"
								className="w-full h-auto object-cover"
								priority={i <= 1}
							/>
						</div>
					{/each}
				</div>
			</div>

			<!-- Right Column: Sticky Product Info -->
			<div class="lg:w-[40%] xl:w-[35%] px-6 md:px-12 lg:px-0 lg:pr-12 mt-8 lg:mt-0">
				<div class="sticky top-24 lg:max-w-[400px]">
					<!-- Header Info -->
					<div class="mb-8 space-y-4">
						{#if product.categories && product.categories.length > 0}
							<div
								class="text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-primary/50 dark:text-white/50 flex flex-wrap gap-2"
							>
								{#each product.categories as cat, i (cat.id || i)}
									<span>{cat.name}{i < product.categories.length - 1 ? ' ·' : ''}</span>
								{/each}
							</div>
						{/if}

						<h1
							class="font-display text-3xl md:text-4xl text-primary dark:text-white leading-tight"
						>
							{product.title}
						</h1>

						<div class="text-base font-sans text-primary dark:text-white">
							{product.price}
						</div>
					</div>

					<!-- Selectors -->
					<div class="mb-8 space-y-8">
						<!-- Colors -->
						{#if product.colors && product.colors.length > 0}
							<div class="space-y-3">
								<div class="flex flex-wrap gap-2">
									{#each product.colors as color (color)}
										<button
											class="w-8 h-8 rounded-full border border-gray-200 dark:border-white/20 flex items-center justify-center transition-all hover:scale-110 cursor-pointer {selectedColor ===
											color
												? 'ring-1 ring-offset-2 ring-primary dark:ring-white'
												: ''}"
											style="background-color: {color.toLowerCase() === 'black'
												? '#111'
												: color.toLowerCase() === 'white'
													? '#fff'
													: '#888'}"
											onclick={() => (selectedColor = color)}
											aria-label="Select color {color}"
										></button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Sizes -->
						<div class="space-y-3">
							<div class="grid grid-cols-4 gap-2">
								{#each product.sizes as size (size)}
									<button
										class="h-10 border text-[11px] font-sans font-medium transition-all hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary {selectedSize ===
										size
											? 'bg-primary text-white border-primary dark:bg-white dark:text-primary dark:border-white'
											: 'border-gray-200 dark:border-white/20 text-primary dark:text-white'} {sizeError &&
										!selectedSize
											? 'animate-shake'
											: ''}"
										onclick={() => {
											selectedSize = size;
											sizeError = false;
										}}
									>
										{size}
									</button>
								{/each}
							</div>
							<div class="flex justify-end mt-3">
								<button
									class="text-[10px] uppercase tracking-[0.15em] text-primary dark:text-white hover:underline underline-offset-4 cursor-pointer"
									>Size Guide</button
								>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex gap-3 mb-10">
						<button
							onclick={addToBag}
							disabled={isAdding}
							class="flex-1 h-[46px] text-[11px] font-sans font-medium uppercase tracking-[0.2em] transition-all flex items-center justify-center cursor-pointer border {selectedSize
								? 'bg-primary text-white border-primary hover:opacity-90 dark:bg-white dark:text-primary dark:border-white'
								: 'bg-transparent text-primary border-primary hover:bg-primary hover:text-white dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-primary'}"
						>
							{#if isAdding}
								<span
									class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
								></span>
							{:else}
								ADD TO BAG
							{/if}
						</button>
						<button
							class="w-[46px] h-[46px] border border-primary dark:border-white flex items-center justify-center transition-colors hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary group cursor-pointer"
							onclick={() => wishlist.toggle(product)}
							aria-label="Add to wishlist"
						>
							<span
								class="material-symbols-outlined text-[24px] font-light {wishlist.has(product.id)
									? 'font-fill'
									: ''}">favorite</span
							>
						</button>
					</div>

					<!-- Accordions / Info -->
					<div class="space-y-0">
						<!-- Description -->
						<div class="py-4">
							<p class="text-sm font-sans text-primary/80 dark:text-white/80 leading-relaxed">
								{product.description}
							</p>
						</div>

						<!-- Material -->
						<details class="group py-4 cursor-pointer">
							<summary class="flex justify-between items-center list-none outline-none">
								<span class="text-[10px] uppercase tracking-[0.15em] font-medium"
									>Material & Care</span
								>
								<!-- Ultra-thin Vector Icon -->
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									class="transition-transform duration-300 group-open:rotate-45"
								>
									<path
										d="M12 4V20M4 12H20"
										stroke="currentColor"
										stroke-width="1"
										stroke-linecap="butt"
									/>
								</svg>
							</summary>
							<div class="pt-4 text-sm text-primary/70 dark:text-white/70 leading-relaxed">
								<ul class="list-disc pl-4 space-y-1">
									{#each product.details as detail (detail)}
										<li>{detail}</li>
									{/each}
									{#if product.material}<li>
											{product.material}
										</li>{/if}
								</ul>
							</div>
						</details>

						<!-- Shipping -->
						<details class="group py-4 cursor-pointer">
							<summary class="flex justify-between items-center list-none outline-none">
								<span class="text-[10px] uppercase tracking-[0.15em] font-medium"
									>Shipping & Returns</span
								>
								<!-- Ultra-thin Vector Icon -->
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									class="transition-transform duration-300 group-open:rotate-45"
								>
									<path
										d="M12 4V20M4 12H20"
										stroke="currentColor"
										stroke-width="1"
										stroke-linecap="butt"
									/>
								</svg>
							</summary>
							<div class="pt-4 text-sm text-primary/70 dark:text-white/70 leading-relaxed">
								<p>
									{product.shipping ||
										'Free express shipping on all orders over $300. Returns accepted within 14 days.'}
								</p>
							</div>
						</details>
					</div>
				</div>
			</div>
		</div>

		<!-- Related Products -->
		{#if relatedProducts && relatedProducts.length > 0}
			<section class="max-w-[1600px] mx-auto px-6 md:px-12 mt-32 mb-16">
				<h3 class="font-display text-2xl mb-8 text-center uppercase tracking-widest">
					You May Also Like
				</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
					{#each relatedProducts as relatedProduct (relatedProduct.id)}
						<ProductCard product={relatedProduct} href="/shop/{relatedProduct.id}" />
					{/each}
				</div>
			</section>
		{/if}
	</div>
{/if}

<style>
	/* Hide scrollbar but keep functionality */
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-4px);
		}
		75% {
			transform: translateX(4px);
		}
	}
	.animate-shake {
		animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}

	/* Font Fill for icons */
	.font-fill {
		font-variation-settings: 'FILL' 1;
	}

	details > summary::-webkit-details-marker {
		display: none;
	}
</style>
