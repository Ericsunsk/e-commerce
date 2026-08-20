<script lang="ts">
	import { ArrowLeft } from 'lucide-svelte';

	interface Props {
		href: string;
		label: string;
		className?: string;
	}

	let { href, label, className = '' }: Props = $props();
</script>

<a
	{href}
	class="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-text-main dark:text-neutral-500 dark:hover:text-white transition-colors {className}"
>
	<ArrowLeft size={12} class="mr-2" />
	{label}
</a>
