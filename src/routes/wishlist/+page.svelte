<script lang="ts">
    import { useWishlist } from "$lib/stores/wishlist.svelte";
    import { useCart } from "$lib/stores/cart.svelte";
    import RemoteImage from "$lib/components/ui/RemoteImage.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import { fade } from "svelte/transition";
    import { flip } from "svelte/animate";
    import {
        COLORS,
        BUTTON_STYLES,
        TYPOGRAPHY,
        CONTENT_IMAGES,
    } from "$lib/constants";

    const wishlist = useWishlist();
    const cart = useCart();

    // Receive global settings data
    let { data } = $props();

    function moveToBag(product: any) {
        cart.addItem(product, "Standard", "Generic");
        wishlist.remove(product.id);
    }
</script>

<svelte:head>
    <title>Wishlist | {data.settings.siteName}</title>
    <meta
        name="description"
        content="Your curated collection of saved items."
    />
</svelte:head>

<div class="min-h-screen pt-32 pb-20 px-6 md:px-12 {COLORS.bg} overflow-hidden">
    <!-- Header -->
    <div
        class="max-w-[1600px] mx-auto mb-16 md:mb-24 flex flex-col md:flex-row justify-between items-end gap-6"
    >
        <div>
            <h1
                class="text-4xl md:text-7xl font-display font-medium uppercase tracking-[0.05em] mb-2 {COLORS.text}"
            >
                My Collection
            </h1>
        </div>
    </div>

    <div class="max-w-[1600px] mx-auto">
        {#if wishlist.items.length === 0}
            <!-- Artistic Empty State -->
            <div
                class="relative w-full h-[50vh] flex flex-col items-center justify-center overflow-hidden group"
                in:fade
            >
                <div
                    class="absolute inset-0 opacity-10 dark:opacity-20 transition-all duration-700 group-hover:scale-105 group-hover:opacity-20 dark:group-hover:opacity-30"
                >
                    <RemoteImage
                        src={data.settings?.emptyWishlistImage ||
                            CONTENT_IMAGES.WISHLIST_EMPTY}
                        alt="Empty State Texture"
                        className="w-full h-full object-cover grayscale"
                    />
                </div>

                <div class="relative z-10 text-center space-y-8">
                    <p
                        class="text-sm md:text-lg font-display uppercase tracking-[0.3em] {COLORS.text}"
                    >
                        The canvas is empty
                    </p>
                    <Button href="/shop" size="lg">Start Curating</Button>
                </div>
            </div>
        {:else}
            <!-- Editorial Grid -->
            <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-16"
            >
                {#each wishlist.items as product (product.id)}
                    <div
                        in:fade={{ duration: 400 }}
                        animate:flip={{ duration: 400 }}
                        class="group flex flex-col gap-6"
                    >
                        <!-- Image Area -->
                        <div
                            class="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-zinc-800"
                        >
                            <RemoteImage
                                src={product.image || ''}
                                alt={product.title || 'Product'}
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            />

                            <!-- Remove Button (Top Right) -->
                            <button
                                onclick={() => wishlist.remove(product.id)}
                                class="absolute top-0 right-0 p-4 {COLORS.textSubtle} hover:text-primary dark:hover:text-white transition-colors z-20 cursor-pointer"
                                aria-label="Remove"
                            >
                                <span class="material-symbols-outlined text-lg"
                                    >close</span
                                >
                            </button>

                            <!-- Overlay Content (Bottom) -->
                            <div
                                class="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out bg-white/90 dark:bg-black/90 backdrop-blur-sm"
                            >
                                <button
                                    onclick={() => moveToBag(product)}
                                    class="w-full h-12 {BUTTON_STYLES.outline} {TYPOGRAPHY.label} cursor-pointer"
                                >
                                    Move to Bag
                                </button>
                            </div>
                        </div>

                        <!-- Info Area -->
                        <div class="flex justify-between items-start px-1">
                            <div>
                                <h3
                                    class="text-sm font-bold uppercase tracking-widest {COLORS.text} mb-1"
                                >
                                    {product.title}
                                </h3>
                                <p
                                    class="text-xs text-primary/50 dark:text-white/50 tracking-wider"
                                >
                                    In Stock
                                </p>
                            </div>
                            <span class="text-sm font-medium tracking-wide">
                                {product.price}
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
