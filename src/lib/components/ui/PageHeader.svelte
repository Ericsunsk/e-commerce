<script lang="ts">
    import { TYPOGRAPHY, COLORS } from "$lib/constants";
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        backLabel?: string;
        backHref?: string;
        actions?: Snippet;
    }

    let { title, backLabel = "Back", backHref = "", actions }: Props = $props();
</script>

<div class="flex items-center justify-between mb-12">
    <div>
        {#if backHref}
            <a
                href={backHref}
                class="{TYPOGRAPHY.labelSm} {COLORS.textMuted} hover:text-primary dark:hover:text-white transition-colors mb-2 inline-block"
            >
                ← {backLabel}
            </a>
        {/if}
        <h1 class={TYPOGRAPHY.headingXl}>
            {title}
        </h1>
    </div>

    {#if actions}
        <div class="flex items-center gap-4">
            {@render actions()}
        </div>
    {/if}
</div>
