<script lang="ts">
    let { isOpen = $bindable(false) } = $props();
    import { useCart } from "$lib/stores/cart.svelte";
    import { goto } from "$app/navigation";
    import RemoteImage from "./ui/RemoteImage.svelte";
    import Drawer from "./ui/Drawer.svelte";
    import FreeShippingProgress from "./ui/FreeShippingProgress.svelte";
    import { TRANSITIONS } from "$lib/constants";
    import { auth } from "$lib/stores/auth.svelte";

    const cart = useCart();

    function close() {
        isOpen = false;
    }

    const quantityBtnClass = "w-8 h-8 flex items-center justify-center hover:bg-primary/5 dark:hover:bg-white/5 text-primary dark:text-white transition-colors";
</script>

<Drawer {isOpen} onClose={close} width="w-full max-w-md">
    {#snippet header()}
        <div class="flex flex-col border-b border-transparent">
            <div class="flex items-center justify-between p-6 pb-4">
                <h2
                    class="text-[11px] font-sans font-medium uppercase tracking-[0.15em] text-primary dark:text-white"
                >
                    Shopping Bag ({cart.count})
                </h2>
                <button
                    onclick={close}
                    class="hover:opacity-60 {TRANSITIONS.opacity}"
                    aria-label="Close cart"
                >
                    <span class="material-symbols-outlined font-light"
                        >close</span
                    >
                </button>
            </div>

            <!-- Free Shipping Progress -->
            {#if cart.items.length > 0}
                <FreeShippingProgress total={cart.total} />
            {/if}
        </div>
    {/snippet}

    {#if cart.items.length === 0}
        <div
            class="h-full flex flex-col items-center justify-center text-center opacity-60 gap-4 py-12"
        >
            <span class="material-symbols-outlined text-4xl">shopping_bag</span>
            <p class="text-[11px] font-sans uppercase tracking-[0.15em]">
                Your bag is empty
            </p>
            <button
                onclick={close}
                class="text-[10px] font-sans uppercase tracking-[0.15em] underline underline-offset-4 mt-2 hover:text-primary dark:hover:text-white {TRANSITIONS.colors}"
            >
                Continue Shopping
            </button>
        </div>
    {:else}
        <div class="flex flex-col gap-8">
            {#each cart.items as item (item.cartItemId)}
                <div class="flex gap-4">
                    <div class="w-20 aspect-[3/4] bg-white shrink-0">
                        <RemoteImage
                            src={item.image || ''}
                            alt={item.title || 'Product Image'}
                            className="w-full h-full"
                        />
                    </div>
                    <div class="flex-1 flex flex-col justify-between py-1">
                        <div class="flex justify-between items-start gap-4">
                            <div>
                                <h3
                                    class="text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-primary dark:text-white"
                                >
                                    {item.title}
                                </h3>
                                <p
                                    class="text-[10px] font-sans text-primary/60 dark:text-white/60 uppercase tracking-[0.15em] mt-1"
                                >
                                    {item.color} / {item.size}
                                </p>
                            </div>
                            <p
                                class="text-xs font-medium text-primary dark:text-white"
                            >
                                {item.price}
                            </p>
                        </div>
                        <div class="flex justify-between items-center">
                            <div
                                class="flex items-center border border-primary/10 dark:border-white/10 ml-0"
                            >
                                <button
                                    class={quantityBtnClass}
                                    aria-label="Decrease quantity"
                                    onclick={() =>
                                        cart.updateQuantity(
                                            item.cartItemId,
                                            -1,
                                        )}>-</button
                                >
                                <span
                                    class="text-[10px] font-sans w-6 text-center text-primary dark:text-white"
                                    >{item.quantity}</span
                                >
                                <button
                                    class={quantityBtnClass}
                                    aria-label="Increase quantity"
                                    onclick={() =>
                                        cart.updateQuantity(item.cartItemId, 1)}
                                    >+</button
                                >
                            </div>
                            <button
                                class="text-[10px] font-sans uppercase tracking-[0.15em] underline underline-offset-2 opacity-50 hover:opacity-100 text-primary dark:text-white"
                                onclick={() => cart.removeItem(item.cartItemId)}
                                >Remove</button
                            >
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    {#snippet footer()}
        <div class="flex justify-between items-center mb-4">
            <span
                class="text-[11px] font-sans font-medium uppercase tracking-[0.15em] text-primary dark:text-white"
                >Subtotal</span
            >
            <span
                class="text-[11px] font-sans font-medium text-primary dark:text-white"
                >{cart.subtotalFormatted}</span
            >
        </div>

        <button
            class="w-full border border-primary dark:border-white text-primary dark:text-white py-4 text-[11px] font-sans font-bold uppercase tracking-widest hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary {TRANSITIONS.colors}"
            disabled={cart.items.length === 0}
            onclick={() => {
                close();
                if (auth.isAuthenticated) {
                    goto("/checkout");
                } else {
                    goto("/account?redirect=/checkout");
                }
            }}
        >
            Checkout
        </button>
    {/snippet}
</Drawer>
