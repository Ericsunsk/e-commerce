<script lang="ts">
	import { LAYOUT } from '$shared/kernel';

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
