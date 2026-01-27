<script lang="ts">
    /**
     * ProductCardSkeleton - Loading placeholder for ProductCard
     * Displays animated skeleton matching ProductCard layout
     */
    import Skeleton from "./Skeleton.svelte";

    interface Props {
        isFeature?: boolean;
    }

    let { isFeature = false }: Props = $props();
</script>

<div class="flex flex-col gap-4 h-full">
    <!-- Image skeleton -->
    <div
        class="relative overflow-hidden bg-gray-100 dark:bg-zinc-900 {isFeature
            ? 'aspect-[16/10]'
            : 'aspect-[3/4]'}"
    >
        <Skeleton className="absolute inset-0 w-full h-full" />
    </div>

    <!-- Text skeletons -->
    <div class="flex flex-col items-center text-center gap-2 pt-2">
        <!-- Title -->
        <Skeleton height="16px" width="70%" className="mx-auto" />
        <!-- Price -->
        <Skeleton height="12px" width="40%" className="mx-auto" />
    </div>
</div>
