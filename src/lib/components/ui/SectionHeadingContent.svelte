<script lang="ts">
	interface Props {
		heading?: string;
		headingTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p';
		contentHtml?: string;
		wrapperClass?: string;
		headingClass?: string;
		contentClass?: string;
	}

	let {
		heading = '',
		headingTag = 'h2',
		contentHtml = '',
		wrapperClass = '',
		headingClass = '',
		contentClass = ''
	}: Props = $props();
</script>

<div class={wrapperClass}>
	{#if heading}
		<svelte:element this={headingTag} class={headingClass}>{heading}</svelte:element>
	{/if}
	{#if contentHtml}
		<div class={contentClass}>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html contentHtml}
		</div>
	{/if}
</div>
