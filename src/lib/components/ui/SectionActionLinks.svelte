<script lang="ts">
	import type { UISectionAction } from '$lib/types';

	interface Props {
		actions?: UISectionAction[];
		containerClass?: string;
		linkClass?: string;
		preloadData?: 'hover' | 'tap';
	}

	let {
		actions = [],
		containerClass = 'flex flex-wrap items-center justify-center gap-4',
		linkClass = 'inline-flex items-center justify-center px-10 py-4 border text-xs font-sans font-medium tracking-[0.15em] uppercase transition-all cursor-pointer',
		preloadData = 'hover'
	}: Props = $props();

	let visibleActions = $derived(actions.filter((action) => !!action?.text));
</script>

{#if visibleActions.length > 0}
	<div class={containerClass}>
		{#each visibleActions as action, i (action.link || i)}
			<a href={action.link || '#'} data-sveltekit-preload-data={preloadData} class={linkClass}>
				{action.text}
			</a>
		{/each}
	</div>
{/if}
