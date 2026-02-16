<script lang="ts">
	import type { Snippet } from 'svelte';
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';

	interface Props {
		href: string;
		src?: string;
		alt?: string;
		linkClass?: string;
		frameClass?: string;
		imageClassName?: string;
		overlayClassName?: string;
		preloadData?: 'hover' | 'tap';
		thumb?: string;
		children?: Snippet;
	}

	let {
		href,
		src = '',
		alt = 'Image',
		linkClass = 'block',
		frameClass = 'w-full h-full',
		imageClassName = 'w-full h-full object-cover',
		overlayClassName = '',
		preloadData,
		thumb,
		children
	}: Props = $props();
</script>

<a {href} data-sveltekit-preload-data={preloadData} class={linkClass}>
	<div class={frameClass}>
		<RemoteImage {src} {alt} className={imageClassName} {thumb} />
	</div>
	{#if overlayClassName}
		<div class={overlayClassName}></div>
	{/if}
	{@render children?.()}
</a>
