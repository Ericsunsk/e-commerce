<script lang="ts">
	/**
	 * Global icon outlet — single source of truth for icon thickness and
	 * color. Thickness defaults to a 1.2px grid; color always
	 * inherits the surrounding text color, so status colors belong on the
	 * parent, never on the icon itself.
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

	let { icon: Icon, size = 20, strokeWidth = 1.2, class: cls = '', ...rest }: Props = $props();
</script>

<Icon {size} {strokeWidth} class={cls} {...rest} />
