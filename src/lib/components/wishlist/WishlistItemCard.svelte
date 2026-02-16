<script lang="ts">
	import type { WishlistItem } from '$lib/types';
	import CoverImageLayer from '$lib/components/ui/CoverImageLayer.svelte';
	import { COLORS, BUTTON_STYLES, TYPOGRAPHY } from '$lib/constants';

	interface Props {
		item: WishlistItem;
		onRemove: (id: string) => void;
		onMoveToBag: (item: WishlistItem) => void;
	}

	let { item, onRemove, onMoveToBag }: Props = $props();
</script>

<div class="group flex flex-col gap-6">
	<CoverImageLayer
		src={item.image || ''}
		alt={item.title || 'Product'}
		containerClass="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-zinc-800"
		imageClassName="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
	>
		<button
			onclick={() => onRemove(item.id)}
			class="absolute top-0 right-0 p-4 {COLORS.textSubtle} hover:text-primary dark:hover:text-white transition-colors z-20 cursor-pointer"
			aria-label="Remove"
		>
			<span class="material-symbols-outlined text-lg">close</span>
		</button>

		<div
			class="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out bg-white/90 dark:bg-black/90 backdrop-blur-sm"
		>
			<button
				onclick={() => onMoveToBag(item)}
				class="w-full h-12 {BUTTON_STYLES.outline} {TYPOGRAPHY.label} cursor-pointer"
			>
				Move to Bag
			</button>
		</div>
	</CoverImageLayer>

	<div class="flex justify-between items-start px-1">
		<div>
			<h3 class="text-sm font-bold uppercase tracking-widest {COLORS.text} mb-1">
				{item.title}
			</h3>
			<p class="text-xs text-primary/50 dark:text-white/50 tracking-wider">In Stock</p>
		</div>
		<span class="text-sm font-medium tracking-wide">
			{item.price}
		</span>
	</div>
</div>
