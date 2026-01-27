<script lang="ts">
    import { slide } from "svelte/transition";

    interface Props {
        searchQuery: string;
        onSubmit: (e: Event) => void;
    }

    let { searchQuery = $bindable(""), onSubmit }: Props = $props();
</script>

<div
    class="absolute right-6 md:right-12 top-[50px] w-full max-w-[340px] flex items-center justify-end"
    transition:slide={{ duration: 300, axis: "y" }}
>
    <form
        class="w-full relative flex items-center border-b border-primary dark:border-white py-2"
        onsubmit={onSubmit}
    >
        <div class="relative w-full flex items-center">
            <input
                type="text"
                bind:value={searchQuery}
                class="w-full bg-transparent border-none outline-none text-left pl-0 pr-8 text-[10px] uppercase font-sans font-bold tracking-[0.15em] placeholder:text-primary dark:placeholder:text-white caret-transparent"
                placeholder=""
                aria-label="Search"
            />
            {#if !searchQuery}
                <div class="absolute left-0 pointer-events-none">
                    <span class="blinking-cursor"></span>
                </div>
            {/if}
        </div>
        <button
            type="submit"
            class="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center hover:opacity-70 transition-opacity"
            aria-label="Submit search"
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M1 12H23M23 12L19 8M23 12L19 16"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="square"
                />
            </svg>
        </button>
    </form>
</div>

<style>
    .blinking-cursor {
        display: inline-block;
        width: 1px;
        height: 14px;
        background-color: currentColor;
        animation: blink 1s step-end infinite;
    }

    @keyframes blink {
        from,
        to {
            opacity: 1;
        }
        50% {
            opacity: 0;
        }
    }
</style>
