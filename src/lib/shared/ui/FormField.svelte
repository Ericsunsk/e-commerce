<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id: string;
		label: string;
		className?: string;
		error?: string;
		labelClass?: string;
		hideLabel?: boolean;
		hasValue?: boolean;
		control: Snippet;
		extra?: Snippet;
	}

	let {
		id,
		label,
		className = '',
		error = '',
		labelClass = '',
		hideLabel = false,
		hasValue = false,
		control,
		extra
	}: Props = $props();
</script>

<div class="group relative {className}">
	{@render control()}

	<label
		for={id}
		class="absolute left-0 top-4 text-xs font-bold uppercase tracking-[0.15em] transition-all pointer-events-none text-primary/40 dark:text-white/40 peer-focus:text-primary dark:peer-focus:text-white {labelClass}
			{hideLabel && hasValue ? 'opacity-0' : ''}
			{hideLabel ? 'peer-focus:opacity-0' : ''}
			{error ? 'text-red-500 dark:text-red-500' : ''}"
	>
		{label}
	</label>

	{#if error}
		<span
			class="text-[10px] uppercase tracking-[0.15em] text-red-500 absolute right-0 bottom-4 pointer-events-none"
		>
			{error}
		</span>
	{/if}

	{@render extra?.()}
</div>
