<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		id: string;
		label: string;
		value: string;
		type?: 'text' | 'tel';
		required?: boolean;
		placeholder?: string;
		options?: Option[];
		className?: string;
	}

	let {
		id,
		label,
		value = $bindable(''),
		type = 'text',
		required = false,
		placeholder = '',
		options,
		className = ''
	}: Props = $props();
</script>

<div class={className}>
	<label for={id} class="block text-[10px] uppercase tracking-[0.15em] mb-2">
		{label}{required ? ' *' : ''}
	</label>

	{#if Array.isArray(options) && options.length > 0}
		<select
			{id}
			bind:value
			{required}
			class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
		>
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	{:else}
		<input
			{type}
			{id}
			bind:value
			{required}
			{placeholder}
			class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
		/>
	{/if}
</div>
