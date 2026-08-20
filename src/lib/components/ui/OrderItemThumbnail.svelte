<script lang="ts">
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';

	interface Props {
		src?: string;
		alt?: string;
		wrapperClass?: string;
		imageClassName?: string;
		quantityBadge?: number | null;
		badgeClassName?: string;
	}

	let {
		src = '',
		alt = 'Product Image',
		wrapperClass = 'w-16 aspect-[3/4] bg-primary/5 dark:bg-white/5 relative overflow-hidden',
		imageClassName = 'w-full h-full',
		quantityBadge = null,
		badgeClassName = 'absolute top-1 right-1 bg-primary/80 dark:bg-white/80 text-white dark:text-primary text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold'
	}: Props = $props();
</script>

<div class={wrapperClass}>
	<RemoteImage {src} {alt} className={imageClassName} />
	{#if typeof quantityBadge === 'number' && quantityBadge > 0}
		<span class={badgeClassName}>{quantityBadge}</span>
	{/if}
</div>
