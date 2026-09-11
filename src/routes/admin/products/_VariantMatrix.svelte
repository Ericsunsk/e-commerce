<script lang="ts">
	import {
		Layers,
		Plus,
		Trash2,
		Wand2,
		RefreshCw,
		Minus,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import {
		ADMIN_BADGES,
		ADMIN_BUTTONS
	} from '$shared/kernel';
	import {
		DEFAULT_SIZE_PRESETS,
		DEFAULT_COLOR_PRESETS,
		generateSku,
		generateVariantMatrix,
		adjustStock,
		type ColorPreset
	} from '$domains/catalog/domain/variant-matrix';

	export interface VariantRow {
		id?: string;
		color: string;
		colorSwatch?: string;
		size: string;
		sku: string;
		stockQuantity: number;
	}

	let {
		variants = $bindable([]),
		productSlug = ''
	}: {
		variants: VariantRow[];
		productSlug?: string;
	} = $props();

	// Generator collapsible state
	let showGenerator = $state(false);
	let selectedColorPresets = $state<ColorPreset[]>([]);
	let selectedSizes = $state<string[]>([]);
	let generatorDefaultStock = $state(15);
	// svelte-ignore state_referenced_locally
	let generatorPrefix = $state(productSlug || 'PROD');

	// Deletion confirm index
	let confirmDeleteIndex = $state<number | null>(null);

	// Aggregates
	let totalStock = $derived(
		variants.reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0)
	);

	let previewGeneratedCount = $derived(
		(selectedColorPresets.length > 0 ? selectedColorPresets.length : 1) *
			(selectedSizes.length > 0 ? selectedSizes.length : 1)
	);

	function addRow() {
		const baseSku = generateSku(
			productSlug || generatorPrefix || 'PROD',
			'STD',
			'ONE-SIZE'
		);
		variants = [
			...variants,
			{ color: '标准色', colorSwatch: '#18181b', size: 'ONE SIZE', sku: baseSku, stockQuantity: 10 }
		];
	}

	function removeRow(index: number) {
		variants = variants.filter((_, i) => i !== index);
		confirmDeleteIndex = null;
	}

	function toggleSizePreset(size: string) {
		if (selectedSizes.includes(size)) {
			selectedSizes = selectedSizes.filter((s) => s !== size);
		} else {
			selectedSizes = [...selectedSizes, size];
		}
	}

	function toggleColorPreset(preset: ColorPreset) {
		const exists = selectedColorPresets.some((c) => c.name === preset.name);
		if (exists) {
			selectedColorPresets = selectedColorPresets.filter((c) => c.name !== preset.name);
		} else {
			selectedColorPresets = [...selectedColorPresets, preset];
		}
	}

	function selectApparelSizes() {
		selectedSizes = ['S', 'M', 'L', 'XL'];
	}

	function clearGeneratorSelections() {
		selectedColorPresets = [];
		selectedSizes = [];
	}

	function applyGeneratedMatrix(mode: 'append' | 'replace') {
		const base = productSlug || generatorPrefix || 'PROD';
		const generated = generateVariantMatrix({
			productSlug: base,
			colors: selectedColorPresets,
			sizes: selectedSizes,
			defaultStock: generatorDefaultStock
		});

		if (mode === 'replace') {
			variants = generated;
		} else {
			variants = [...variants, ...generated];
		}

		showGenerator = false;
	}

	function refreshRowSku(index: number) {
		const row = variants[index];
		if (!row) return;
		const base = productSlug || generatorPrefix || 'PROD';
		variants[index] = {
			...row,
			sku: generateSku(base, row.color || 'CLR', row.size || 'STD')
		};
	}

	function regenerateAllSkus() {
		const base = productSlug || generatorPrefix || 'PROD';
		variants = variants.map((row) => ({
			...row,
			sku: generateSku(base, row.color || 'CLR', row.size || 'STD')
		}));
	}

	function modifyRowStock(index: number, delta: number) {
		const row = variants[index];
		if (!row) return;
		variants[index] = {
			...row,
			stockQuantity: adjustStock(row.stockQuantity, delta)
		};
	}
</script>

<div class="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-4 sm:p-5 space-y-4">
	<!-- Top Toolbar -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200/60 pb-3.5">
		<div>
			<div class="flex items-center gap-2 flex-wrap">
				<span class="text-xs font-bold uppercase tracking-wider text-zinc-800">
					商品规格矩阵
				</span>
				<span class={ADMIN_BADGES.neutral}>
					{variants.length} 个规格
				</span>
				{#if variants.length > 0}
					<span class="{totalStock > 0 ? ADMIN_BADGES.success : ADMIN_BADGES.danger}">
						总库存: {totalStock} 件
					</span>
				{/if}
			</div>
			<p class="text-[11px] text-zinc-400 mt-0.5">
				管理多颜色、尺码、SKU 条码与独立现货库存分配
			</p>
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			{#if variants.length > 1}
				<button
					type="button"
					onclick={regenerateAllSkus}
					title="根据当前前缀统一重整所有规格条码"
					class={ADMIN_BUTTONS.secondarySm}
				>
					<UiIcon icon={RefreshCw} size={13} />
					统一重排 SKU
				</button>
			{/if}

			<button
				type="button"
				onclick={() => (showGenerator = !showGenerator)}
				class={showGenerator ? ADMIN_BUTTONS.primarySm : ADMIN_BUTTONS.secondarySm}
			>
				<UiIcon icon={Wand2} size={13} />
				<span>批量预设生成</span>
				{#if showGenerator}
					<UiIcon icon={ChevronUp} size={13} />
				{:else}
					<UiIcon icon={ChevronDown} size={13} />
				{/if}
			</button>

			<button
				type="button"
				onclick={addRow}
				class={ADMIN_BUTTONS.primarySm}
			>
				<UiIcon icon={Plus} size={13} />
				添加单行
			</button>
		</div>
	</div>

	<!-- Collapsible Batch Generator Panel -->
	{#if showGenerator}
		<div class="p-4 rounded-xl bg-white border border-zinc-300/80 space-y-4">
			<div class="flex items-center justify-between border-b border-zinc-100 pb-2.5">
				<div class="flex items-center gap-2">
					<div class="p-1 rounded-md bg-zinc-100 text-zinc-800">
						<UiIcon icon={Wand2} size={14} />
					</div>
					<div>
						<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-900">
							变体矩阵组合生成器
						</h3>
						<p class="text-[11px] text-zinc-400">
							勾选所需颜色与尺码预设，系统将自动进行笛卡尔乘积组合并生成规范 SKU
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={clearGeneratorSelections}
					class="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer"
				>
					清空勾选
				</button>
			</div>

			<!-- Color Presets -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
						1. 选择颜色预设 ({selectedColorPresets.length} 已选)
					</span>
				</div>

				<div class="flex flex-wrap gap-2">
					{#each DEFAULT_COLOR_PRESETS as preset (preset.name)}
						{@const isSelected = selectedColorPresets.some((c) => c.name === preset.name)}
						<button
							type="button"
							onclick={() => toggleColorPreset(preset)}
							class={isSelected ? ADMIN_BUTTONS.pillActive : ADMIN_BUTTONS.pillInactive}
						>
							<span
								class="w-3 h-3 rounded-full border border-black/20 shrink-0"
								style="background-color: {preset.swatch};"
							></span>
							<span>{preset.name}</span>
							<span class="text-[10px] font-mono opacity-60">({preset.slug})</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Size Presets -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
						2. 选择尺码预设 ({selectedSizes.length} 已选)
					</span>
					<button
						type="button"
						onclick={selectApparelSizes}
						class="text-[11px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2 cursor-pointer"
					>
						快速填充常规服装码 (S-XL)
					</button>
				</div>

				<div class="flex flex-wrap gap-2">
					{#each DEFAULT_SIZE_PRESETS as size (size)}
						{@const isSelected = selectedSizes.includes(size)}
						<button
							type="button"
							onclick={() => toggleSizePreset(size)}
							class={isSelected ? ADMIN_BUTTONS.pillActive : ADMIN_BUTTONS.pillInactive}
						>
							{size}
						</button>
					{/each}
				</div>
			</div>

			<!-- Options & Action Bar -->
			<div class="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
				<div class="flex items-center gap-3 w-full sm:w-auto">
					<div class="flex items-center gap-2">
						<span class="text-xs text-zinc-500">初始库存:</span>
						<input
							type="number"
							min="0"
							bind:value={generatorDefaultStock}
							class="w-20 bg-white border border-zinc-300 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-900 outline-none focus:border-zinc-900"
						/>
					</div>
					<span class="text-xs text-zinc-400">
						将生成 <strong class="font-mono text-zinc-900">{previewGeneratedCount}</strong> 个变体
					</span>
				</div>

				<div class="flex items-center gap-2 w-full sm:w-auto justify-end">
					{#if variants.length > 0}
						<button
							type="button"
							onclick={() => applyGeneratedMatrix('append')}
							disabled={selectedColorPresets.length === 0 && selectedSizes.length === 0}
							class={ADMIN_BUTTONS.secondary}
						>
							追加到现有列表
						</button>
					{/if}

					<button
						type="button"
						onclick={() => applyGeneratedMatrix('replace')}
						disabled={selectedColorPresets.length === 0 && selectedSizes.length === 0}
						class={ADMIN_BUTTONS.primary}
					>
						{#if variants.length > 0}
							覆盖生成矩阵
						{:else}
							一键生成规格矩阵
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Matrix Rows List -->
	{#if variants.length > 0}
		<div class="space-y-2.5">
			{#each variants as row, index (index)}
				{@const isConfirming = confirmDeleteIndex === index}
				<div
					class="bg-white p-3.5 rounded-xl border border-zinc-200/90 hover:border-zinc-300 transition-colors flex flex-col lg:flex-row lg:items-center gap-3"
				>
					<!-- Row index badge -->
					<div class="hidden lg:flex items-center justify-center w-6 text-[11px] font-mono text-zinc-400 shrink-0">
						#{index + 1}
					</div>

					<!-- Color & Swatch -->
					<div class="flex-1 min-w-[160px]">
						<span class="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
							颜色 / 色块
						</span>
						<div class="flex items-center gap-2">
							<label
								class="w-7 h-7 rounded-lg border border-zinc-200 shrink-0 shadow-xs cursor-pointer flex items-center justify-center overflow-hidden relative"
								title="选择或微调颜色色块"
							>
								<input
									type="color"
									bind:value={row.colorSwatch}
									class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
								/>
								<span
									class="w-full h-full"
									style="background-color: {row.colorSwatch || '#18181b'};"
								></span>
							</label>

							<input
								bind:value={row.color}
								placeholder="例如：曜石黑"
								aria-label="规格颜色"
								class="w-full bg-zinc-50/50 border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:bg-white focus:border-zinc-900 transition-colors"
							/>
						</div>
					</div>

					<!-- Size -->
					<div class="w-full lg:w-28 shrink-0">
						<span class="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
							尺码
						</span>
						<input
							bind:value={row.size}
							placeholder="如：M"
							aria-label="规格尺码"
							class="w-full bg-zinc-50/50 border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-900 outline-none focus:bg-white focus:border-zinc-900 transition-colors"
						/>
					</div>

					<!-- SKU with refresh -->
					<div class="flex-1 min-w-[200px]">
						<div class="flex items-center justify-between mb-1">
							<span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								SKU 条码
							</span>
							<button
								type="button"
								onclick={() => refreshRowSku(index)}
								title="根据商品 slug 与当前属性刷新 SKU"
								class="text-[10px] text-zinc-400 hover:text-zinc-800 flex items-center gap-0.5 cursor-pointer"
							>
								<UiIcon icon={RefreshCw} size={11} />
								刷新
							</button>
						</div>
						<input
							bind:value={row.sku}
							placeholder="JVR-SHIRT-BLK-M"
							aria-label="规格 SKU"
							class="w-full bg-zinc-50/50 border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-900 outline-none focus:bg-white focus:border-zinc-900 transition-colors"
						/>
					</div>

					<!-- Stock Micro-adjustments -->
					<div class="w-full lg:w-44 shrink-0">
						<div class="flex items-center justify-between mb-1">
							<span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								库存数量
							</span>
							{#if row.stockQuantity <= 0}
								<span class={ADMIN_BADGES.danger}>缺货</span>
							{:else if row.stockQuantity <= 5}
								<span class={ADMIN_BADGES.warning}>紧张</span>
							{:else}
								<span class={ADMIN_BADGES.success}>充足</span>
							{/if}
						</div>

						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => modifyRowStock(index, -1)}
								disabled={row.stockQuantity <= 0}
								aria-label="减少库存"
								class="w-7 h-7 rounded-card border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 flex items-center justify-center text-zinc-600 transition-colors cursor-pointer"
							>
								<UiIcon icon={Minus} size={12} />
							</button>

							<input
								type="number"
								min="0"
								step="1"
								bind:value={row.stockQuantity}
								aria-label="规格库存数量"
								class="w-16 bg-white border border-zinc-300 rounded-card py-1 px-1 text-xs font-mono text-center text-zinc-900 outline-none focus:border-zinc-900"
							/>

							<button
								type="button"
								onclick={() => modifyRowStock(index, 1)}
								aria-label="增加 1 件库存"
								class="w-7 h-7 rounded-card border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-600 transition-colors cursor-pointer"
							>
								<UiIcon icon={Plus} size={12} />
							</button>

							<button
								type="button"
								onclick={() => modifyRowStock(index, 10)}
								title="快捷补货 +10"
								class="px-1.5 h-7 rounded-card border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[10px] font-mono text-zinc-600 transition-colors cursor-pointer"
							>
								+10
							</button>
						</div>
					</div>

					<!-- Delete / Safe confirm -->
					<div class="flex items-center justify-end lg:pt-4 shrink-0">
						{#if isConfirming}
							<div class="flex items-center gap-1.5 animate-in fade-in duration-150">
								<button
									type="button"
									onclick={() => removeRow(index)}
									class={ADMIN_BUTTONS.dangerSolidSm}
								>
									确认删除
								</button>
								<button
									type="button"
									onclick={() => (confirmDeleteIndex = null)}
									class={ADMIN_BUTTONS.secondarySm}
								>
									取消
								</button>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => (confirmDeleteIndex = index)}
								title="删除此规格行"
								aria-label="删除规格行"
								class={ADMIN_BUTTONS.danger}
							>
								<UiIcon icon={Trash2} size={15} />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Empty State with Quick Starter -->
		<div class="py-8 px-6 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-white/60 space-y-3">
			<div class="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
				<UiIcon icon={Layers} size={20} />
			</div>
			<div class="space-y-1">
				<p class="text-xs font-bold text-zinc-700 uppercase tracking-wider">
					当前暂未配置细分规格
				</p>
				<p class="text-[11px] text-zinc-400 max-w-md mx-auto">
					无细分规格时商品将直接按单一整体库存销售。如需售卖不同颜色或尺码，可点击上方预设生成。
				</p>
			</div>

			<div class="flex items-center justify-center gap-2 pt-1">
				<button
					type="button"
					onclick={() => {
						showGenerator = true;
						selectApparelSizes();
					}}
					class={ADMIN_BUTTONS.secondary}
				>
					<UiIcon icon={Wand2} size={13} />
					一键开启预设配置
				</button>
			</div>
		</div>
	{/if}
</div>
