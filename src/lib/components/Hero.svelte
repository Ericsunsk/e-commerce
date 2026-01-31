<script lang="ts">
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';
	import type { UISection } from '$lib/types';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	interface HeroProps {
		section: UISection;
	}

	let { section }: HeroProps = $props();

	// 安全地构造幻灯片列表
	let slides = $derived.by(() => {
		if (!section) return [];
		const items: { type: 'image' | 'video'; url: string }[] = [];

		// 视频源
		const vGallery = section.videoGallery || [];
		if (vGallery.length > 0) {
			vGallery.forEach((v) => v && items.push({ type: 'video', url: v }));
		} else if (section.videoUrl) {
			items.push({ type: 'video', url: section.videoUrl });
		}

		// 图片源
		const iGallery = section.imageGallery || [];
		if (iGallery.length > 0) {
			iGallery.forEach((img) => img && items.push({ type: 'image', url: img }));
		} else if (section.imageUrl) {
			items.push({ type: 'image', url: section.imageUrl });
		}

		return items;
	});

	let currentIndex = $state(0);

	onMount(() => {
		if (slides.length <= 1) return;

		const interval = setInterval(() => {
			if (slides.length > 1) {
				currentIndex = (currentIndex + 1) % slides.length;
			}
		}, 5000);

		return () => clearInterval(interval);
	});
</script>

<section
	class="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden bg-black"
>
	<!-- Background Slideshow -->
	<div class="absolute inset-0 w-full h-full z-0">
		{#if slides.length > 0}
			{#each slides as slide, i (slide.url + i)}
				{#if i === currentIndex}
					<div class="absolute inset-0 w-full h-full" transition:fade={{ duration: 1000 }}>
						{#if slide.type === 'video'}
							<video
								src={slide.url}
								autoplay
								loop
								muted
								playsinline
								class="w-full h-full object-cover"
							></video>
						{:else}
							<RemoteImage
								src={slide.url}
								alt={section.heading || ''}
								className="w-full h-full object-cover"
								priority={i === 0}
							/>
						{/if}
						<!-- Dark Overlay -->
						<div class="absolute inset-0 bg-black/30"></div>
					</div>
				{/if}
			{/each}
		{:else}
			<!-- Fallback if no images/videos -->
			<div class="absolute inset-0 bg-neutral-900 w-full h-full"></div>
		{/if}
	</div>

	<!-- Center Title -->
	<div
		class="relative z-10 flex flex-col items-center justify-center h-full w-full px-4 text-center relative -top-6 md:-top-8"
	>
		{#if section.subheading}
			<span
				class="text-white text-[13px] font-sans font-medium tracking-[0.3em] uppercase mb-4 opacity-80"
				in:fade={{ delay: 300, duration: 1000 }}
			>
				{section.subheading}
			</span>
		{/if}
		{#if section.heading}
			<h1
				class="text-white text-[9.5vw] lg:text-[6.5vw] font-display font-normal tracking-normal mb-2 opacity-95 uppercase whitespace-nowrap leading-tight max-w-full"
				in:fade={{ delay: 500, duration: 1000 }}
			>
				{section.heading}
			</h1>
		{/if}
	</div>

	<!-- Bottom Actions -->
	<div
		class="absolute bottom-16 md:bottom-24 z-20 w-full flex flex-col md:flex-row items-center justify-center gap-10 px-6"
	>
		{#if section.settings?.actions}
			{#each section.settings.actions as action}
				{#if action.text}
					<a
						href={action.link || '#'}
						data-sveltekit-preload-data="hover"
						class="inline-flex items-center justify-center w-full md:w-[320px] px-8 py-4 border border-white text-white text-xs font-sans font-medium tracking-[0.15em] uppercase transition-all duration-300 hover:bg-white hover:text-black"
					>
						{action.text}
					</a>
				{/if}
			{/each}
		{/if}
	</div>

	<!-- Pagination Dots -->
	{#if slides.length > 1}
		<div class="absolute bottom-8 z-30 flex gap-2">
			{#each slides as _, i}
				<button
					class="w-1.5 h-1.5 rounded-full transition-all duration-500 {i === currentIndex
						? 'bg-white w-4'
						: 'bg-white/30'}"
					onclick={() => (currentIndex = i)}
					aria-label="Go to slide {i + 1}"
				></button>
			{/each}
		</div>
	{/if}
</section>
