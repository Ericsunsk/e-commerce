<script lang="ts">
	import type { Snippet } from 'svelte';
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';

	interface Props {
		src?: string;
		alt?: string;
		containerClass?: string;
		imageClassName?: string;
		overlayClassName?: string;
		priority?: boolean;
		thumb?: string;
		children?: Snippet;
	}

	let {
		src = '',
		alt = 'Image',
		containerClass = 'relative',
		imageClassName = 'w-full h-full object-cover',
		overlayClassName = '',
		priority = false,
		thumb,
		children
	}: Props = $props();
</script>

<div class={containerClass}>
	<RemoteImage {src} {alt} className={imageClassName} {priority} {thumb} />
	{#if overlayClassName}
		<div class={overlayClassName}></div>
	{/if}
	{@render children?.()}
</div>
