<script lang="ts">
	interface SkeletonProps {
		className?: string;
		width?: string;
		height?: string;
		circle?: boolean;
	}

	let { className = '', width = '100%', height = 'auto', circle = false }: SkeletonProps = $props();

	// 构建基础样式类
	const baseClasses = 'animate-pulse bg-gray-200 dark:bg-zinc-800';
	let shapeClasses = $derived(circle ? 'rounded-full' : 'rounded-sm');
</script>

<div
	class="{baseClasses} {shapeClasses} {className}"
	style="width: {width}; height: {height};"
	role="status"
	aria-label="Loading..."
>
	<span class="sr-only">Loading...</span>
</div>
