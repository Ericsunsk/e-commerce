<script lang="ts">
	export interface VariantRow {
		id?: string;
		color: string;
		size: string;
		sku: string;
		stockQuantity: number;
	}

	let { variants = $bindable([]) }: { variants: VariantRow[] } = $props();

	function addRow() {
		variants = [...variants, { color: '', size: '', sku: '', stockQuantity: 0 }];
	}

	function removeRow(index: number) {
		variants = variants.filter((_, i) => i !== index);
	}
</script>

<div class="mb-2 flex items-center justify-between">
	<span class="text-[10px] uppercase tracking-[0.2em] text-white/50">Variants</span>
	<button
		type="button"
		onclick={addRow}
		class="text-[11px] uppercase tracking-widest text-white/70 hover:text-white"
	>
		+ Add row
	</button>
</div>

{#each variants as row, index (index)}
	<div class="grid grid-cols-12 gap-2 mb-2">
		<input
			bind:value={row.color}
			placeholder="Color"
			aria-label="Variant color"
			class="col-span-3 bg-transparent border border-white/20 px-3 py-2 text-sm outline-none focus:border-white"
		/>
		<input
			bind:value={row.size}
			placeholder="Size"
			aria-label="Variant size"
			class="col-span-2 bg-transparent border border-white/20 px-3 py-2 text-sm outline-none focus:border-white"
		/>
		<input
			bind:value={row.sku}
			placeholder="SKU"
			aria-label="Variant SKU"
			class="col-span-4 bg-transparent border border-white/20 px-3 py-2 text-sm font-mono outline-none focus:border-white"
		/>
		<input
			bind:value={row.stockQuantity}
			type="number"
			min="0"
			step="1"
			aria-label="Variant stock"
			class="col-span-2 bg-transparent border border-white/20 px-3 py-2 text-sm outline-none focus:border-white"
		/>
		<button
			type="button"
			onclick={() => removeRow(index)}
			aria-label="Remove variant row"
			class="col-span-1 text-white/40 hover:text-red-400"
		>
			<span class="material-symbols-outlined">delete</span>
		</button>
	</div>
{/each}
{#if variants.length === 0}
	<p class="text-xs text-white/30 mb-2">No variants — product sells as a single SKU.</p>
{/if}
