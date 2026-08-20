<script lang="ts">
	import SectionRenderer from '$lib/components/SectionRenderer.svelte';

	let { data } = $props();

	// SEO Meta
	let metaTitle = $derived(
		data.page.title ? `${data.page.title} | ${data.settings.siteName}` : data.settings.siteName
	);
	// Page 接口使用 camelCase
	let metaDesc = $derived(data.page.metaDescription || '');
	let ogImage = $derived(data.page.ogImage ? data.page.ogImage : '');

	// 排序 Sections
	let sortedSections = $derived(
		data.sections ? [...data.sections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) : []
	);
</script>

<svelte:head>
	<title>{metaTitle}</title>
	<meta name="description" content={metaDesc} />

	<!-- Open Graph -->
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDesc} />
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
	{/if}
</svelte:head>

<div class="min-h-screen bg-background-light dark:bg-background-dark">
	{#if sortedSections.length > 0}
		<!-- 方式 A: 页面构建器模式 (Section Builder) -->
		<div class="flex flex-col w-full">
			{#each sortedSections as section (section.id)}
				<SectionRenderer {section} />
			{/each}
		</div>
	{:else}
		<!-- 方式 B: 传统文档模式 (Simple Rich Text Page) -->
		<div class="w-full pt-32 pb-24 px-6 md:px-12">
			<div class="max-w-[800px] mx-auto">
				<h1
					class="text-4xl md:text-5xl font-display uppercase tracking-widest mb-12 text-text-main dark:text-white"
				>
					{data.page.title}
				</h1>

				{#if data.page.content}
					<div
						class="prose prose-lg dark:prose-invert max-w-none text-text-main/80 dark:text-white/80 leading-relaxed font-sans"
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html data.page.content}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
