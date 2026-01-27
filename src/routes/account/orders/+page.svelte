<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { auth } from "$lib/stores/auth.svelte";
    import RemoteImage from "$lib/components/ui/RemoteImage.svelte";
    import PageHeader from "$lib/components/ui/PageHeader.svelte";
    import LoadingState from "$lib/components/ui/LoadingState.svelte";
    import EmptyState from "$lib/components/ui/EmptyState.svelte";
    import { onMount } from "svelte";
    import { pb } from "$lib/pocketbase";
    import type { Order } from "$lib/types";
    import { formatDate } from "$lib/utils";
    import { formatCurrency } from "$lib/utils/price";
    import { LAYOUT, COLORS } from "$lib/constants";

    let { data } = $props();

    let isLoggedIn = $derived(auth.isAuthenticated);
    let currentUser = $derived(auth.user);
    let orders = $state<Order[]>([]);
    let isLoading = $state(true);

    // Redirect if not logged in
    $effect(() => {
        if (!isLoggedIn) {
            goto("/account?redirect=/account/orders");
        }
    });

    onMount(async () => {
        if (isLoggedIn && currentUser) {
            try {
                // Use server-side API handler to bypass client-side permission issues
                // and utilize admin privileges for fetching orders
                const res = await fetch(`/api/orders?userId=${currentUser.id}`);
                const result = await res.json();

                if (result.orders) {
                    orders = result.orders;
                }
            } catch (e) {
                console.error("Failed to load orders:", e);
            }
        }
        isLoading = false;
    });

    // Use formatCurrency directly
    function formatOrderPrice(
        amount: number,
        currency: string = "USD",
    ): string {
        return formatCurrency(amount, { currency, isCents: true });
    }

    function getStatusColor(status: string): string {
        switch (status) {
            case "paid":
                return "text-green-600 dark:text-green-400";
            case "processing":
                return "text-blue-600 dark:text-blue-400";
            case "shipped":
                return "text-purple-600 dark:text-purple-400";
            case "delivered":
                return "text-green-700 dark:text-green-300";
            case "cancelled":
                return "text-red-600 dark:text-red-400";
            default:
                return "text-yellow-600 dark:text-yellow-400";
        }
    }
</script>

<svelte:head>
    <title>Order History | {data.settings.siteName}</title>
</svelte:head>

<div class={LAYOUT.pageContainer}>
    <div class={LAYOUT.contentWrapper}>
        <PageHeader
            title="Order History"
            backLabel="Back to Account"
            backHref="/account"
        />

        {#if isLoading}
            <LoadingState message="Loading orders..." />
        {:else if orders.length === 0}
            <EmptyState
                title="No Orders Yet"
                description="Your order history will appear here after your first purchase."
                actionLabel="Start Shopping"
                actionHref="/shop"
                icon="shopping_bag"
            />
        {:else}
            <div class="space-y-6">
                {#each orders as order (order.id)}
                    <div
                        class="border border-primary/10 dark:border-white/10 p-6"
                        in:fade={{ duration: 300 }}
                    >
                        <div
                            class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
                        >
                            <div>
                                <p
                                    class="text-[10px] uppercase tracking-[0.15em] text-primary/60 dark:text-white/60"
                                >
                                    Order #{order.id.slice(0, 8).toUpperCase()}
                                </p>
                                <p class="text-sm">
                                    {formatDate(order.created)}
                                </p>
                            </div>
                            <div class="flex items-center gap-6">
                                <span
                                    class="text-[10px] uppercase tracking-[0.15em] font-bold {getStatusColor(
                                        order.status,
                                    )}"
                                >
                                    {order.status}
                                </span>
                                <span class="font-bold">
                                    {formatOrderPrice(
                                        order.amountTotal,
                                        order.currency,
                                    )}
                                </span>
                            </div>
                        </div>

                        <!-- Order Items -->
                        <div class="space-y-4">
                            {#each order.items as item}
                                <div class="flex gap-4">
                                    {#if item.image}
                                        <RemoteImage
                                            src={item.image}
                                            alt={item.title}
                                            className="w-16 h-20 object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="w-16 h-20 bg-primary/5 dark:bg-white/5"
                                        ></div>
                                    {/if}
                                    <div class="flex-1">
                                        <p class="font-medium">{item.title}</p>
                                        <p
                                            class="text-xs text-primary/60 dark:text-white/60"
                                        >
                                            {#if item.color}Color: {item.color}{/if}
                                            {#if item.size}
                                                · Size: {item.size}{/if}
                                            · Qty: {item.quantity}
                                        </p>
                                    </div>
                                    <p class="text-sm">
                                        {formatOrderPrice(
                                            item.price * item.quantity,
                                            order.currency,
                                        )}
                                    </p>
                                </div>
                            {/each}
                        </div>

                        {#if order.trackingNumber}
                            <div
                                class="mt-6 pt-6 border-t border-primary/10 dark:border-white/10"
                            >
                                <p
                                    class="text-[10px] uppercase tracking-[0.15em] text-primary/60 dark:text-white/60"
                                >
                                    Tracking: {order.trackingCarrier || ""}
                                    {order.trackingNumber}
                                </p>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
