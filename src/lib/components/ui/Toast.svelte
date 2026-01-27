<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { flip } from "svelte/animate";
    import { Z_INDEX, TRANSITIONS } from "$lib/constants";
    import { toastStore } from "$lib/stores/toast.svelte";
    import { cubicOut } from "svelte/easing";

    // Custom Apple-style easing
    const appleEase = (t: number) => {
        // Approximation of cubic-bezier(0.16, 1, 0.3, 1)
        return 1 - Math.pow(1 - t, 4); 
    };
</script>

<!-- Toast Container: Top Center -->
<div
    class="fixed top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 {Z_INDEX.toast} pointer-events-none w-full max-w-sm px-4"
    aria-live="polite"
    aria-label="Notifications"
>
    {#each toastStore.items as item (item.id)}
        <div
            in:fly={{ y: -20, duration: 600, easing: appleEase }}
            out:fade={{ duration: 200 }}
            animate:flip={{ duration: 400, easing: appleEase }}
            class="pointer-events-auto flex items-center justify-between gap-6 px-6 py-4 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xl w-auto min-w-[320px]"
            role="alert"
        >
            <p
                class="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-primary dark:text-white leading-none"
            >
                {item.message}
            </p>
            <button
                onclick={() => toastStore.dismiss(item.id)}
                class="text-primary/40 dark:text-white/40 hover:text-primary dark:hover:text-white {TRANSITIONS.colors} cursor-pointer flex items-center"
                aria-label="Dismiss"
            >
                <!-- Minimal Cross Icon -->
                <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M1 1L11 11M11 1L1 11"
                        stroke="currentColor"
                        stroke-width="1"
                    />
                </svg>
            </button>
        </div>
    {/each}
</div>
