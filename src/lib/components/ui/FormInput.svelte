<script lang="ts">
	import FormField from './FormField.svelte';

	interface Props {
		id: string;
		label: string;
		value: string;
		name?: string; // Add name prop
		type?: 'text' | 'email' | 'tel' | 'password';
		error?: string; // String error message
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		className?: string;
		autocomplete?: import('svelte/elements').FullAutoFill | null;
		oninput?: (e: Event) => void;
		[key: string]: unknown; // Allow other props
	}

	let {
		id,
		label,
		value = $bindable(''),
		name,
		type = 'text',
		error = '',
		placeholder = '',
		disabled = false,
		required = false,
		className = '',
		autocomplete,
		oninput,
		...rest
	}: Props = $props();

	// Default name to id if not provided, for Form Data
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
		<input
			{type}
			{id}
			name={inputName}
			bind:value
			{disabled}
			{required}
			placeholder={placeholder || label}
			{autocomplete}
			{oninput}
			{...rest}
			class="w-full bg-transparent border-b py-4 text-sm tracking-widest outline-none focus:outline-none focus:ring-0 rounded-none placeholder:text-transparent peer autofill:shadow-[0_0_0_30px_white_inset] dark:autofill:shadow-[0_0_0_30px_black_inset] autofill:text-fill-primary dark:autofill:text-fill-white transition-colors duration-300 border-primary dark:border-white {error
				? 'text-red-500 border-red-500'
				: ''} disabled:opacity-50"
		/>
	{/snippet}
</FormField>
