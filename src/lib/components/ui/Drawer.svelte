<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { TRANSITIONS } from '$lib/constants';

	import type { Snippet } from 'svelte';

	interface DrawerProps {
		isOpen: boolean;
		onClose: () => void;
		title?: string;
		width?: string;
		children: Snippet;
		footer?: Snippet;
		header?: Snippet;
	}

	let {
		isOpen = false,
		onClose,
		title = undefined,
		width = 'w-full md:w-[500px]',
		children,
		footer = undefined,
		header = undefined
	}: DrawerProps = $props();

	// ESC 键关闭 Drawer
	$effect(() => {
		if (!isOpen) return;

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose();
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if isOpen}
	<div class="fixed inset-0 z-[var(--z-modal)] flex justify-end" role="dialog" aria-modal="true">
		<!-- Backdrop -->
		<div
			class="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
			onclick={onClose}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
			role="button"
			tabindex="-1"
			aria-label="Close drawer"
			transition:fade={{ duration: 300 }}
		></div>

		<!-- Drawer Panel -->
		<div
			class="relative h-full {width} bg-background-light dark:bg-background-dark shadow-2xl flex flex-col pointer-events-auto"
			transition:fly={{ x: '100%', duration: 400, opacity: 1 }}
		>
			<!-- Drawer Header -->
			{#if header}
				{@render header()}
			{:else}
				<div
					class="flex items-center justify-between px-6 py-6 md:px-8 md:py-8 border-b border-transparent"
				>
					<h2 class="text-[12px] font-bold tracking-[0.2em] uppercase text-primary dark:text-white">
						{title}
					</h2>
					<button
						onclick={onClose}
						class="hover:opacity-60 ${TRANSITIONS.opacity} p-2 -mr-2"
						aria-label="Close"
					>
						<span class="material-symbols-outlined font-light">close</span>
					</button>
				</div>
			{/if}

			<!-- Drawer Content (Scrollable) -->
			<div class="flex-1 overflow-y-auto px-6 md:px-8 py-6 scrollbar-hide relative">
				{@render children()}
			</div>

			{#if footer}
				<div
					class="border-t border-transparent p-6 md:p-8 bg-background-light dark:bg-background-dark"
				>
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
