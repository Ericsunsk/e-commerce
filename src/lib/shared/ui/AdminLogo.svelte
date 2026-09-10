<script lang="ts">
	import { Store } from 'lucide-svelte';
	import UiIcon from './UiIcon.svelte';

	interface Props {
		class?: string;
		iconSize?: number;
		label?: string;
	}

	let { class: cls = 'w-8 h-8', iconSize = 16, label = '店铺 logo' }: Props = $props();
</script>

<div
	class="rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs {cls}"
	role="img"
	aria-label={label}
>
	<UiIcon icon={Store} size={iconSize} />
</div>
