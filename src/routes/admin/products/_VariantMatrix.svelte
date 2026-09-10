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

<div class="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<span class="text-xs font-bold uppercase tracking-wider text-zinc-700">Product Variants</span>
			<p class="text-[11px] text-zinc-400 mt-0.5">Define color, size, SKU, and available inventory</p>
		</div>
		<button
			type="button"
			onclick={addRow}
			class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-100 hover:text-zinc-900 shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-sm">add</span>
			Add Variant
		</button>
	</div>

	{#each variants as row, index (index)}
		<div class="grid grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-lg border border-zinc-200 shadow-xs">
			<div class="col-span-3">
				<label class="block">
					<span class="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Color</span>
					<input
						bind:value={row.color}
						placeholder="e.g. Onyx Black"
						aria-label="Variant color"
						class="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</label>
			</div>
			<div class="col-span-2">
				<label class="block">
					<span class="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Size</span>
					<input
						bind:value={row.size}
						placeholder="e.g. L"
						aria-label="Variant size"
						class="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</label>
			</div>
			<div class="col-span-4">
				<label class="block">
					<span class="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">SKU</span>
					<input
						bind:value={row.sku}
						placeholder="e.g. JVR-TS-BLK-L"
						aria-label="Variant SKU"
						class="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</label>
			</div>
			<div class="col-span-2">
				<label class="block">
					<span class="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Stock</span>
					<input
						bind:value={row.stockQuantity}
						type="number"
						min="0"
						step="1"
						aria-label="Variant stock"
						class="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</label>
			</div>
			<div class="col-span-1 flex items-end justify-center pt-5">
				<button
					type="button"
					onclick={() => removeRow(index)}
					aria-label="Remove variant row"
					class="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">delete</span>
				</button>
			</div>
		</div>
	{/each}

	{#if variants.length === 0}
		<div class="py-6 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-white/50">
			<span class="material-symbols-outlined text-2xl text-zinc-300 block mb-1">layers_clear</span>
			<p class="text-xs font-medium text-zinc-500">No variants added</p>
			<p class="text-[11px] text-zinc-400 mt-0.5">Product will sell as a single SKU unless variants are defined.</p>
		</div>
	{/if}
</div>
