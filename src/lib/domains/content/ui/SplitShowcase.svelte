<script lang="ts">
	import { RemoteImage } from '$shared/ui';
	import type { UISection } from '../domain/models';
	import { resolveSplitShowcase } from '../domain/split-showcase';

	interface Props {
		section: UISection;
	}

	let { section }: Props = $props();

	let showcase = $derived(resolveSplitShowcase(section));
</script>

<section class="relative w-full min-h-[60vh] md:min-h-[80vh] flex flex-col md:flex-row overflow-hidden bg-background-light dark:bg-background-dark">
	{#if showcase.heading}
		<div class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none text-center px-4">
			<h2 class="font-display text-4xl md:text-7xl lg:text-8xl font-bold tracking-[0.05em] leading-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] uppercase select-none">
				{showcase.heading}
			</h2>
		</div>
	{/if}

	{#each showcase.panels as panel (panel.id)}
		{#if panel.link}
			<a
				href={panel.link}
				class="relative flex-1 group block overflow-hidden bg-primary/10 min-h-[360px] md:min-h-0"
			>
				<RemoteImage
					src={panel.image}
					alt={panel.title}
					className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
					priority={true}
					thumb="2000x0"
				/>
				<div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
				{#if panel.title}
					<div class="absolute bottom-8 left-8 right-8 z-10 flex justify-between items-center text-white">
						<span class="text-xs md:text-sm font-semibold tracking-widest uppercase">{panel.title}</span>
						<span class="text-xs tracking-widest underline underline-offset-4 opacity-80 group-hover:opacity-100">Explore &rarr;</span>
					</div>
				{/if}
			</a>
		{:else}
			<div class="relative flex-1 block overflow-hidden bg-primary/10 min-h-[360px] md:min-h-0">
				<RemoteImage
					src={panel.image}
					alt={panel.title}
					className="w-full h-full object-cover"
					priority={true}
					thumb="2000x0"
				/>
				<div class="absolute inset-0 bg-black/20"></div>
				{#if panel.title}
					<div class="absolute bottom-8 left-8 right-8 z-10 text-white">
						<span class="text-xs md:text-sm font-semibold tracking-widest uppercase">{panel.title}</span>
					</div>
				{/if}
			</div>
		{/if}
	{/each}
</section>
