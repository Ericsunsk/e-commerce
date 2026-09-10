<script lang="ts">
	import { LAYOUT, COLORS, BUTTON_STYLES } from '$shared/kernel';
	import UiIcon from './UiIcon.svelte';
	import type { Component } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		actionLabel?: string;
		actionHref?: string;
		icon?: Component<{ size?: number | string; class?: string }>;
	}

	let { title, description = '', actionLabel = '', actionHref = '', icon }: Props = $props();

	const Icon = $derived(icon);
</script>

<div class={LAYOUT.emptyState}>
	{#if Icon}
		<div class="{COLORS.textMuted} mb-4">
			<UiIcon icon={Icon} size={36} />
		</div>
	{/if}

	<p class="text-xl font-display uppercase tracking-widest mb-4 {COLORS.text}">
		{title}
	</p>

	{#if description}
		<p class="text-sm {COLORS.textMuted} mb-8 max-w-md mx-auto">
			{description}
		</p>
	{/if}

	{#if actionLabel && actionHref}
		<a
			href={actionHref}
			class="inline-block {BUTTON_STYLES.outline} {BUTTON_STYLES.base} {BUTTON_STYLES.sizeLg}"
		>
			{actionLabel}
		</a>
	{/if}
</div>
