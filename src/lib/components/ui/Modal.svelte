<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { createEventDispatcher } from 'svelte';
	import { Z_INDEX, TRANSITIONS, COLORS } from '$lib/constants';
	import type { Snippet } from 'svelte';

	interface ModalProps {
		show: boolean;
		title: string;
		children?: Snippet;
	}

	let { show = $bindable(false), title, children }: ModalProps = $props();

	const dispatch = createEventDispatcher();

	function close() {
		show = false;
		dispatch('close');
	}

	// ESC 键关闭 Modal
	$effect(() => {
		if (!show) return;

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				close();
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if show}
	<!-- Backdrop -->
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm {Z_INDEX.modalBackdrop}"
		transition:fade={{ duration: 200 }}
		onclick={close}
		aria-hidden="true"
	></div>

	<!-- Modal Content -->
	<div
		class="fixed inset-0 flex items-center justify-center p-4 {Z_INDEX.modal} pointer-events-none"
	>
		<div
			class="w-full max-w-lg {COLORS.bgAlt} {COLORS.text} shadow-2xl pointer-events-auto border border-primary/10 dark:border-white/10"
			transition:scale={{ start: 0.95, duration: 200 }}
			role="dialog"
			aria-modal="true"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-primary/5 dark:border-white/5"
			>
				<h3 class="text-xs font-bold uppercase tracking-widest">
					{title}
				</h3>
				<button
					onclick={close}
					class="opacity-60 hover:opacity-100 {TRANSITIONS.opacity}"
					aria-label="Close"
				>
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			</div>

			<!-- Body -->
			<div class="p-6">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
