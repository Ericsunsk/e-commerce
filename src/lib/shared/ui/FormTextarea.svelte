<script lang="ts">
	import FormField from './FormField.svelte';

	interface Props {
		id: string;
		label: string;
		value: string;
		name?: string;
		error?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		rows?: number;
		className?: string;
		oninput?: (e: Event) => void;
		[key: string]: unknown;
	}

	let {
		id,
		label,
		value = $bindable(''),
		name,
		error = '',
		placeholder = '',
		disabled = false,
		required = false,
		rows = 4,
		className = '',
		oninput,
		...rest
	}: Props = $props();

	let inputName = $derived(name || id);
</script>

<FormField
	{id}
	{label}
	{error}
	{className}
	labelClass="peer-focus:-top-4 peer-focus:text-[10px] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-primary dark:peer-[:not(:placeholder-shown)]:text-white"
>
	{#snippet control()}
		<textarea
			{id}
			name={inputName}
			bind:value
			{rows}
			{disabled}
			{required}
			placeholder={placeholder || label}
			{oninput}
			{...rest}
			class="w-full bg-transparent border-b py-4 text-sm tracking-widest outline-none focus:outline-none focus:ring-0 rounded-none placeholder:text-transparent peer resize-none transition-colors duration-300 border-primary dark:border-white {error
				? 'text-red-500 border-red-500'
				: ''} disabled:opacity-50"
		></textarea>
	{/snippet}
</FormField>
