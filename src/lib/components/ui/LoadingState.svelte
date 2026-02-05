<script lang="ts">
	import { LAYOUT } from '$lib/constants';

	interface Props {
		message?: string;
	}

	let { message = 'Loading...' }: Props = $props();
</script>

<div class={LAYOUT.loadingCenter}>
	<div class={LAYOUT.loadingText}>
		{message}
	</div>
</div>
