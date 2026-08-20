<script lang="ts">
	import type { Snippet } from 'svelte';
	import { TRANSITIONS } from '$lib/constants';

	interface Props {
		variant?: 'outline' | 'solid';
		size?: 'sm' | 'md' | 'lg';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		fullWidth?: boolean;
		className?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	let {
		variant = 'outline',
		size = 'md',
		href = '',
		type = 'button',
		disabled = false,
		fullWidth = false,
		className = '',
		onclick,
		children
	}: Props = $props();

	// Base styles
	const base =
		'font-bold uppercase tracking-widest cursor-pointer inline-flex items-center justify-center ' +
		TRANSITIONS.colors +
		' ' +
		TRANSITIONS.transform +
		' active:scale-[0.98]';

	// Size variants
	const sizes = {
		sm: 'h-10 px-4 text-[10px] tracking-[0.15em]',
		md: 'h-12 px-6 text-[10px] tracking-[0.2em]',
		lg: 'h-14 px-10 text-xs tracking-widest'
	};

	// Style variants
	const variants = {
		outline:
			'border border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary',
		solid: 'bg-primary text-white dark:bg-white dark:text-primary hover:opacity-90'
	};

	let classes = $derived(
		`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`
	);
</script>

{#if href}
	<a {href} class={classes} class:opacity-50={disabled} class:pointer-events-none={disabled}>
		{@render children()}
	</a>
{:else}
	<button {type} {disabled} class={classes} {onclick}>
		{@render children()}
	</button>
{/if}
