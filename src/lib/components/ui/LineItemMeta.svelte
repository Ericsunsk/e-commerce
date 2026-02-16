<script lang="ts">
	let {
		title = '',
		color = '',
		size = '',
		price = '',
		titleTag = 'h3',
		wrapperClass = 'flex justify-between items-start gap-4',
		contentClass = '',
		titleClass = 'text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-primary dark:text-white',
		detailsClass = 'text-[10px] font-sans text-primary/60 dark:text-white/60 uppercase tracking-[0.15em] mt-1',
		priceClass = 'text-xs font-medium text-primary dark:text-white'
	} = $props<{
		title?: string;
		color?: string;
		size?: string;
		price?: string | number | null;
		titleTag?: string;
		wrapperClass?: string;
		contentClass?: string;
		titleClass?: string;
		detailsClass?: string;
		priceClass?: string;
	}>();

	function hasText(value: string | null | undefined): value is string {
		return typeof value === 'string' && value.trim().length > 0;
	}

	const variantText = $derived.by(() => [color, size].filter(hasText).join(' / '));
	const hasPrice = $derived.by(() => price !== '' && price !== null && price !== undefined);
</script>

<div class={wrapperClass}>
	<div class={contentClass}>
		<svelte:element this={titleTag} class={titleClass}>{title}</svelte:element>
		{#if variantText}
			<p class={detailsClass}>{variantText}</p>
		{/if}
	</div>
	{#if hasPrice}
		<p class={priceClass}>{price}</p>
	{/if}
</div>
