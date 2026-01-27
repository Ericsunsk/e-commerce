<script lang="ts">
    import Skeleton from "$lib/components/ui/Skeleton.svelte";
    import { appendThumbToUrl } from "$lib/utils/image";

    /**
     * RemoteImage 组件 - 用于远程 URL 图片
     *
     * 注意: @sveltejs/enhanced-img 仅适用于本地静态图片（构建时优化）。
     * 对于来自 R2/CDN 的远程图片，我们使用此组件实现：
     * - 骨架屏占位
     * - loading="lazy" / "eager" 优先级控制
     * - decoding="async"
     * - fetchpriority 支持
     *
     * 如需使用 enhanced-img 处理本地图片，请使用：
     * import { enhanced } from '@sveltejs/enhanced-img';
     * <enhanced:img src="$lib/assets/local-image.jpg" alt="..." />
     */
    interface Props {
        src: string;
        alt: string;
        className?: string;
        style?: string;
        priority?: boolean; // If true, loading="eager" and fetchpriority="high"
        aspectRatio?: string; // e.g., "3/4" or "16/9" for aspect-ratio CSS
        thumb?: string; // PocketBase thumbnail format e.g. "100x100"
    }

    let {
        src,
        alt,
        className = "",
        style = "",
        priority = false,
        aspectRatio,
        thumb,
    }: Props = $props();

    let loaded = $state(false);
    let error = $state(false);

    let finalSrc = $derived.by(() => {
        if (!src) return "";
        if (thumb) {
            return appendThumbToUrl(src, thumb);
        }
        return src;
    });

    function handleLoad() {
        loaded = true;
    }

    function handleError() {
        error = true;
        loaded = true; // Stop showing skeleton
    }

    // 构建 aspect-ratio 样式
    let computedStyle = $derived(
        aspectRatio ? `aspect-ratio: ${aspectRatio}; ${style}` : style,
    );
</script>

<svelte:head>
    {#if priority && finalSrc}
        <link rel="preload" as="image" href={finalSrc} fetchpriority="high" />
    {/if}
</svelte:head>

<div class="relative overflow-hidden {className}" style={computedStyle}>
    <!-- Skeleton / Placeholder -->
    {#if !loaded && !error && finalSrc}
        <div aria-hidden="true" class="absolute inset-0 w-full h-full z-0">
            <Skeleton className="w-full h-full rounded-none" />
        </div>
    {/if}

    <!-- Elegant solid color fallback (All Black) -->
    {#if error || !finalSrc}
        <div aria-hidden="true" class="absolute inset-0 w-full h-full bg-neutral-900 z-0"></div>
    {/if}

    <!-- Image -->
    {#if finalSrc}
        <img
            src={finalSrc}
            {alt}
            class="w-full h-full object-cover transition-opacity duration-700 ease-out z-10 {loaded &&
            !error
                ? 'opacity-100'
                : 'opacity-0'}"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchpriority={priority ? "high" : "auto"}
            onload={handleLoad}
            onerror={handleError}
        />
    {/if}
</div>
