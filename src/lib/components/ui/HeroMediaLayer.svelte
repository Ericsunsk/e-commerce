<script lang="ts">
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';

	interface Props {
		mediaType: 'image' | 'video';
		src: string;
		alt?: string;
		priority?: boolean;
		mediaClassName?: string;
		overlayClassName?: string;
	}

	let {
		mediaType,
		src,
		alt = 'Hero media',
		priority = false,
		mediaClassName = 'w-full h-full object-cover',
		overlayClassName = 'absolute inset-0 bg-black/30'
	}: Props = $props();
</script>

{#if mediaType === 'video'}
	<video {src} autoplay loop muted playsinline class={mediaClassName}></video>
{:else}
	<RemoteImage {src} {alt} className={mediaClassName} {priority} />
{/if}

{#if overlayClassName}
	<div class={overlayClassName}></div>
{/if}
