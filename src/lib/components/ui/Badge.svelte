<script lang="ts">
    type BadgeVariant =
        | "default"
        | "outline"
        | "secondary"
        | "accent"
        | "destructive";

    interface Props {
        children?: import("svelte").Snippet;
        variant?: BadgeVariant;
        className?: string;
    }

    let { children, variant = "default", className = "" }: Props = $props();

    const variants: Record<BadgeVariant, string> = {
        default: "bg-primary text-white dark:bg-white dark:text-primary",
        outline:
            "border border-primary dark:border-white text-primary dark:text-white bg-transparent",
        secondary: "bg-gray-100 dark:bg-zinc-800 text-primary dark:text-white",
        accent: "bg-amber-500 text-white border-none", // Sale/New
        destructive: "bg-red-600 text-white border-none", // Sold out
    };
</script>

<span
    class="inline-flex items-center justify-center px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm whitespace-nowrap {variants[
        variant
    ]} {className}"
>
    {@render children?.()}
</span>
