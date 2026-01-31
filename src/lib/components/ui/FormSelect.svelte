<script lang="ts">
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

<div class="group relative {className}">
	<select
		{id}
		bind:value
		{disabled}
		{required}
		class="w-full bg-transparent border-b py-4 text-sm tracking-widest outline-none focus:outline-none focus:ring-0 rounded-none appearance-none transition-colors duration-300 border-primary dark:border-white disabled:opacity-50 peer"
	>
		<option value="" disabled selected></option>
		{#each options as option, i (typeof option === 'string' ? option : option.value)}
			{#if typeof option === 'string'}
				<option value={option}>{option}</option>
			{:else}
				<option value={option.value}>{option.label}</option>
			{/if}
		{/each}
	</select>

	<label
		for={id}
		class="absolute left-0 top-4 text-xs font-bold uppercase tracking-[0.15em] transition-all
               peer-focus:-top-4 peer-focus:text-[10px]
               peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[10px]
               {value ? '-top-4 text-[10px]' : ''} 
               {hideLabel && (value || $state.snapshot(value)) ? 'opacity-0' : ''}
               pointer-events-none text-primary/40 dark:text-white/40
               peer-focus:text-primary dark:peer-focus:text-white
               {hideLabel && 'peer-focus:opacity-0'}"
	>
		{label}
	</label>

	<!-- Chevron Icon -->
	<div class="absolute right-0 top-4 pointer-events-none">
		<span class="material-symbols-outlined text-sm">expand_more</span>
	</div>
</div>
