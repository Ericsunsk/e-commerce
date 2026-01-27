<script lang="ts">
    import { fade } from "svelte/transition";
    import Button from "$lib/components/ui/Button.svelte";
    import { onMount } from "svelte";
    
    let isVisible = $state(false);

    onMount(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            // Delay showing slightly for better UX
            setTimeout(() => {
                isVisible = true;
            }, 1000);
        }
    });

    function accept() {
        localStorage.setItem('cookie_consent', 'accepted');
        isVisible = false;
    }

    function decline() {
        // Technically minimal cookies are essential, so 'decline' usually means 'only essential'
        localStorage.setItem('cookie_consent', 'declined');
        isVisible = false;
    }
</script>

{#if isVisible}
    <div 
        transition:fade={{ duration: 300 }}
        class="fixed bottom-0 left-0 w-full z-50 bg-zinc-900 text-white p-4 md:p-6 border-t border-zinc-800 shadow-2xl"
    >
        <div class="max-w-[1200px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex-1">
                <p class="text-xs uppercase tracking-widest font-bold mb-1">We use cookies</p>
                <p class="text-xs text-zinc-400 max-w-2xl">
                    We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                    By clicking "Accept All", you consent to our use of cookies.
                </p>
            </div>
            <div class="flex items-center gap-3">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    className="!text-white !border-zinc-700 hover:!bg-zinc-800 hover:!text-white"
                    onclick={decline}
                >
                    Essential Only
                </Button>
                <Button 
                    size="sm" 
                    className="!bg-white !text-black hover:!bg-zinc-200"
                    onclick={accept}
                >
                    Accept All
                </Button>
            </div>
        </div>
    </div>
{/if}