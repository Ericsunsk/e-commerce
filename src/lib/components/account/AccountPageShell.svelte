<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		contentClass?: string;
		className?: string;
	}

	let { children, contentClass = 'max-w-5xl mx-auto', className = '' }: Props = $props();
</script>

<div
	class="min-h-screen bg-background-light dark:bg-background-dark pt-[80px] pb-20 px-6 md:px-12 {className}"
>
	<div class={contentClass}>
		{@render children()}
	</div>
</div>
