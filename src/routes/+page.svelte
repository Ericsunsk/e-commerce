<script lang="ts">
	import SectionRenderer from '$lib/components/SectionRenderer.svelte';
	import Metadata from '$lib/components/seo/Metadata.svelte';

	let { data } = $props();

	// 按 sortOrder 排序的 sections
	let sortedSections = $derived(
		[...data.sections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
	);

	// 获取 hero section 用于 SEO
	let heroSection = $derived(data.sections.find((s) => s.type === 'hero'));

	let metaTitle = $derived(data.page?.title || heroSection?.heading || data.settings.siteName);
	let metaDesc = $derived(data.page?.metaDescription || heroSection?.subheading || '');
	let metaImage = $derived(data.page?.ogImage || heroSection?.imageUrl || '');
</script>

<Metadata
	title={metaTitle}
	description={metaDesc}
	image={metaImage}
	siteName={data.settings.siteName}
/>

<!-- 动态渲染所有 sections -->
{#each sortedSections as section (section.id)}
	<SectionRenderer
		{section}
		categories={data.categories}
		featuredProducts={data.featuredProducts}
		homeAssets={data.homeAssets}
	/>
{/each}
