<script lang="ts">
    import Hero from "$lib/components/Hero.svelte";
    import FeatureSplit from "$lib/components/FeatureSplit.svelte";
    import CtaBanner from "$lib/components/CtaBanner.svelte";
    import HeroCategories from "$lib/components/HeroCategories.svelte";
    import ProductGrid from "$lib/components/ProductGrid.svelte";
    import type { UISection, Category, Product, UIAsset } from "$lib/types";

    interface Props {
        section: UISection;
        categories?: Category[];
        featuredProducts?: Product[];
        homeAssets?: UIAsset[];
    }

    let {
        section,
        categories = [],
        featuredProducts = [],
        homeAssets = [],
    }: Props = $props();
</script>

<!-- 根据 section.type 动态渲染对应组件 -->
{#if section.type === "hero"}
    <Hero {section} />
{:else if section.type === "feature_split"}
    <FeatureSplit {section} />
{:else if section.type === "cta_banner"}
    <CtaBanner {section} />
{:else if section.type === "category_grid"}
    <!-- 首页大入口：使用 PocketBase 配置的图片 -->
    <HeroCategories assets={homeAssets} />
{:else if section.type === "product_grid"}
    <ProductGrid {section} products={featuredProducts} />
{:else if section.type === "rich_text"}
    <!-- Rich Text Section -->
    <section class="py-24 px-6 md:px-12 bg-white dark:bg-background-dark">
        <div class="max-w-[900px] mx-auto text-center">
            {#if section.heading}
                <h2
                    class="text-xs font-sans font-medium tracking-[0.2em] uppercase text-primary/60 dark:text-white/60 mb-6"
                >
                    {section.heading}
                </h2>
            {/if}
            {#if section.content}
                <div
                    class="font-display text-2xl md:text-4xl leading-relaxed text-text-main dark:text-white antialiased"
                >
                    {@html section.content}
                </div>
            {/if}
        </div>
    </section>
{:else}
    <!-- Unknown section type: debug mode -->
    <section class="py-8 px-6 bg-yellow-50 dark:bg-yellow-900/20">
        <div
            class="max-w-[1200px] mx-auto text-center text-sm text-yellow-800 dark:text-yellow-200"
        >
            ⚠️ Unknown section type: <code class="font-mono"
                >{section.type}</code
            >
        </div>
    </section>
{/if}
