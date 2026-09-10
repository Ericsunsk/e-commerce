<script lang="ts">
	import { ICONS } from '$shared/kernel';

	/**
	 * Global icon outlet — single source of truth for icon thickness and
	 * color. Defaults to centralized ICONS design tokens.
	 */
	interface Props {
		// Any renderable icon component (e.g. lucide-svelte icons, which are
		// Svelte 5 function components and don't satisfy the legacy Component type).
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		size?: number | string;
		strokeWidth?: number | string;
		class?: string;
		[key: string]: unknown;
	}

	let {
		icon: Icon,
		size = ICONS.sizeMd,
		strokeWidth = ICONS.strokeWidth,
		class: cls = '',
		...rest
	}: Props = $props();
</script>

<Icon {size} {strokeWidth} class={cls} {...rest} />

