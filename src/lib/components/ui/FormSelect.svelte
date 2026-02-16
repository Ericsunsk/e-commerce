<script lang="ts">
	import FormField from './FormField.svelte';

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		id: string;
		label: string;
		value: string;
		options: (string | Option)[];
		disabled?: boolean;
		required?: boolean;
		className?: string;
		hideLabel?: boolean;
	}

	let {
		id,
		label,
		value = $bindable(''),
		options,
		disabled = false,
		required = false,
		className = '',
		hideLabel = false
	}: Props = $props();
</script>

<FormField
	{id}
	{label}
	{className}
	{hideLabel}
	hasValue={!!value}
	labelClass="peer-focus:-top-4 peer-focus:text-[10px] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[10px] {value
		? '-top-4 text-[10px]'
		: ''}"
>
	{#snippet control()}
		<select
			{id}
			bind:value
			{disabled}
			{required}
			class="w-full bg-transparent border-b py-4 text-sm tracking-widest outline-none focus:outline-none focus:ring-0 rounded-none appearance-none transition-colors duration-300 border-primary dark:border-white disabled:opacity-50 peer"
		>
			<option value="" disabled selected></option>
			{#each options as option (typeof option === 'string' ? option : option.value)}
				{#if typeof option === 'string'}
					<option value={option}>{option}</option>
				{:else}
					<option value={option.value}>{option.label}</option>
				{/if}
			{/each}
		</select>
	{/snippet}
	{#snippet extra()}
		<div class="absolute right-0 top-4 pointer-events-none">
			<span class="material-symbols-outlined text-sm">expand_more</span>
		</div>
	{/snippet}
</FormField>
