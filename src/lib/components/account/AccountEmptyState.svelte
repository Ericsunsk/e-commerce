<script lang="ts">
	import type { Snippet } from 'svelte';
	import { BUTTON_STYLES, COLORS } from '$lib/constants';

	interface Props {
		title: string;
		description?: string;
		actionLabel?: string;
		actionHref?: string;
		onAction?: () => void;
		actionVariant?: 'outline' | 'solid';
		className?: string;
		icon?: Snippet;
	}

	let {
		title,
		description = '',
		actionLabel = '',
		actionHref = '',
		onAction,
		actionVariant = 'outline',
		className = '',
		icon
	}: Props = $props();

	const outlineActionClass = `${BUTTON_STYLES.outline} ${BUTTON_STYLES.base} ${BUTTON_STYLES.sizeLg}`;
	const solidActionClass =
		'inline-flex items-center justify-center px-10 py-4 bg-primary text-white dark:bg-white dark:text-primary font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity';
</script>

<div class="text-center {className}">
	{#if icon}
		<div class="mb-8">
			{@render icon()}
		</div>
	{/if}

	<h2 class="font-display text-2xl uppercase tracking-wide mb-4 {COLORS.text}">
		{title}
	</h2>

	{#if description}
		<p class="text-sm mb-10 max-w-sm mx-auto leading-relaxed {COLORS.textMuted}">
			{description}
		</p>
	{/if}

	{#if actionLabel && actionHref}
		<a href={actionHref} class={actionVariant === 'solid' ? solidActionClass : outlineActionClass}>
			{actionLabel}
		</a>
	{:else if actionLabel && onAction}
		<button
			type="button"
			onclick={onAction}
			class={actionVariant === 'solid' ? solidActionClass : outlineActionClass}
		>
			{actionLabel}
		</button>
	{/if}
</div>
