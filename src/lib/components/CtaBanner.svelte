<script lang="ts">
	import CoverImageLayer from '$lib/components/ui/CoverImageLayer.svelte';
	import SectionActionLinks from '$lib/components/ui/SectionActionLinks.svelte';
	import SectionHeadingContent from '$lib/components/ui/SectionHeadingContent.svelte';
	import type { UISection } from '$lib/types';

	let { section }: { section: UISection } = $props();

	const hasImage = $derived(!!(section.imageUrl || section.imageGallery?.length));
</script>

<section
	class="relative w-full py-32 md:py-48 overflow-hidden {hasImage
		? ''
		: 'bg-white dark:bg-background-dark'}"
>
	<!-- Background for Image Version -->
	{#if hasImage}
		<CoverImageLayer
			src={section.imageUrl || ''}
			alt={section.heading || ''}
			containerClass="absolute inset-0 z-0"
			imageClassName="w-full h-full object-cover"
			overlayClassName="absolute inset-0 bg-black/40"
		/>
	{/if}

	<!-- Content -->
	<div class="relative z-10 max-w-[1200px] mx-auto px-6 text-center flex flex-col items-center">
		{#if section.settings?.actions?.[0] && !section.settings.actions[0].text}
			<a href={section.settings.actions[0].link} class="group">
				{#if section.subheading}
					<span
						class="block text-[10px] md:text-[12px] font-sans font-medium tracking-[0.3em] uppercase mb-8 transition-opacity group-hover:opacity-60 {hasImage
							? 'text-white/70'
							: 'text-primary/40 dark:text-white/40'}"
					>
						{section.subheading}
					</span>
				{/if}

				<h2
					class="text-3xl md:text-7xl font-display font-normal tracking-wide uppercase transition-transform duration-500 group-hover:scale-[1.02] {hasImage
						? 'text-white'
						: 'text-primary dark:text-white'}"
				>
					{section.heading}
				</h2>
			</a>
		{:else}
			{#if section.subheading}
				<span
					class="block text-[10px] md:text-[12px] font-sans font-medium tracking-[0.3em] uppercase mb-8 {hasImage
						? 'text-white/70'
						: 'text-primary/40 dark:text-white/40'}"
				>
					{section.subheading}
				</span>
			{/if}

			<SectionHeadingContent
				heading={section.heading}
				headingTag="h2"
				contentHtml={section.content}
				headingClass="text-3xl md:text-7xl font-display font-normal tracking-wide uppercase {hasImage
					? 'text-white'
					: 'text-primary dark:text-white'}"
				contentClass="text-sm md:text-base max-w-xl mx-auto mt-8 mb-10 {hasImage
					? 'text-white/80'
					: 'text-primary/60 dark:text-white/60'}"
			/>

			{#if section.settings?.actions}
				<SectionActionLinks
					actions={section.settings.actions}
					linkClass="inline-flex items-center justify-center px-10 py-4 border text-xs font-sans font-medium tracking-[0.15em] uppercase transition-all cursor-pointer {hasImage
						? 'border-white text-white hover:bg-white hover:text-primary'
						: 'border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary'}"
				/>
			{/if}
		{/if}
	</div>
</section>
