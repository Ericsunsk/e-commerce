<script lang="ts">
    import { LAYOUT, COLORS, BUTTON_STYLES, TYPOGRAPHY } from "$lib/constants";

    interface Props {
        title: string;
        description?: string;
        actionLabel?: string;
        actionHref?: string;
        icon?: string;
    }

    let {
        title,
        description = "",
        actionLabel = "",
        actionHref = "",
        icon = "",
    }: Props = $props();
</script>

<div class={LAYOUT.emptyState}>
    {#if icon}
        <span
            class="material-symbols-outlined text-4xl {COLORS.textMuted} mb-4"
        >
            {icon}
        </span>
    {/if}

    <p
        class="text-xl font-display uppercase tracking-widest mb-4 {COLORS.text}"
    >
        {title}
    </p>

    {#if description}
        <p class="text-sm {COLORS.textMuted} mb-8 max-w-md mx-auto">
            {description}
        </p>
    {/if}

    {#if actionLabel && actionHref}
        <a
            href={actionHref}
            class="inline-block {BUTTON_STYLES.outline} {BUTTON_STYLES.base} {BUTTON_STYLES.sizeLg}"
        >
            {actionLabel}
        </a>
    {/if}
</div>
