<script lang="ts">
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';
	import type { UISection } from '$lib/types';

	let { section }: { section: UISection } = $props();
</script>

<section class="grid grid-cols-1 md:grid-cols-2 h-auto md:h-[80vh]">
	<div class="relative overflow-hidden min-h-[400px] md:min-h-0">
		<RemoteImage
			src={section.imageUrl || ''}
			alt={section.heading || 'Story'}
			className="w-full h-full object-cover"
		/>
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
			<span class="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold"> Story </span>
		</div>
	</div>
	<div class="bg-white dark:bg-zinc-900 flex flex-col justify-center p-12 md:p-24">
		<h2 class="text-3xl md:text-5xl font-display leading-tight mb-8 text-text-main dark:text-white">
			{section.heading}
		</h2>
		<div
			class="text-sm md:text-base text-primary dark:text-white leading-relaxed tracking-widest mb-10 max-w-md [&>p]:mb-4 last:[&>p]:mb-0"
		>
			{@html section.content}
		</div>
		{#if section.settings?.actions?.[0]}
			<a
				href={section.settings.actions[0].link || '/about'}
				data-sveltekit-preload-data="hover"
				class="inline-block text-xs font-bold uppercase tracking-widest border border-primary dark:border-white py-4 px-10 hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all self-start"
			>
				{section.settings.actions[0].text}
			</a>
		{/if}
	</div>
</section>
