<script lang="ts">
	import { Store } from 'lucide-svelte';
	import UiIcon from './UiIcon.svelte';

	interface Props {
		class?: string;
		iconSize?: number;
		label?: string;
		src?: string | null;
	}

	let { class: cls = 'w-8 h-8', iconSize = 16, label = '店铺 logo', src = null }: Props = $props();
</script>

{#if src}
	<img
		{src}
		alt={label}
		class="object-contain shrink-0 {cls}"
	/>
{:else}
	<div
		class="rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 {cls}"
		role="img"
		aria-label={label}
	>
		<UiIcon icon={Store} size={iconSize} />
	</div>
{/if}
