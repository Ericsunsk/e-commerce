<script lang="ts">
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
		autocomplete?: string;
		oninput?: (e: Event) => void;
		[key: string]: any; // Allow other props
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
	const inputName = name || id;
</script>

<div class="group relative {className}">
	<input
		{type}
		{id}
		name={inputName}
		bind:value
		{disabled}
		{required}
		placeholder={label}
		autocomplete={autocomplete as any}
		{oninput}
		{...rest}
		class="w-full bg-transparent border-b py-4 text-sm tracking-widest outline-none focus:outline-none focus:ring-0 rounded-none placeholder:text-transparent peer autofill:shadow-[0_0_0_30px_white_inset] dark:autofill:shadow-[0_0_0_30px_black_inset] autofill:text-fill-primary dark:autofill:text-fill-white transition-colors duration-300 border-primary dark:border-white {error
			? 'text-red-500 border-red-500'
			: ''} disabled:opacity-50"
	/>
	<label
		for={id}
		class="absolute left-0 top-4 text-xs font-bold uppercase tracking-[0.15em] transition-all peer-focus:-top-4 peer-focus:text-[10px] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[10px] pointer-events-none text-primary/40 dark:text-white/40 peer-focus:text-primary dark:peer-focus:text-white peer-[:not(:placeholder-shown)]:text-primary dark:peer-[:not(:placeholder-shown)]:text-white {error
			? 'text-red-500 dark:text-red-500'
			: ''}"
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
</div>
