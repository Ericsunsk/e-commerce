<script lang="ts">
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import {
		Layers,
		Plus,
		Trash2,
		Wand2,
		RefreshCw,
		ChevronDown,
		ChevronUp,
		ImagePlus,
		Image as ImageIcon,
		Copy,
		X
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { getFileUrl } from '$shared/kernel';
	import { ADMIN_BUTTONS } from '$shared/kernel';
	import {
		DEFAULT_SIZE_PRESETS,
		DEFAULT_COLOR_PRESETS,
		generateSku,
		generateVariantMatrix,
		adjustStock,
		sanitizeSkuSegment,
		type ColorPreset
	} from '$domains/catalog/domain/variant-matrix';

	export interface VariantRow {
		id?: string;
		color: string;
		colorSwatch?: string;
		size: string;
		sku: string;
		stockQuantity: number;
		/** Retained gallery filenames (server-stored). */
		gallery?: string[];
		/** Pending uploads (never serialized; sent as multipart). */
		galleryFiles?: File[];
	}

	export const MAX_GALLERY_PER_VARIANT = 4;

	let {
		variants = $bindable([]),
		productSlug = ''
	}: {
		variants: VariantRow[];
		productSlug?: string;
	} = $props();

	function colorKeyOf(row: VariantRow): string {
		return row.color.trim().toLowerCase() || '(未命名颜色)';
	}

	interface ColorGroup {
		key: string;
		color: string;
		colorSwatch?: string;
		entries: Array<{ row: VariantRow; index: number }>;
		gallery: string[];
		pendingFiles: Array<{ file: File; ownerIndex: number }>;
		stockTotal: number;
	}

	let colorGroups = $derived.by(() => {
		const map = new SvelteMap<string, ColorGroup>();
		variants.forEach((row, index) => {
			const key = colorKeyOf(row);
			let group = map.get(key);
			if (!group) {
				group = {
					key,
					color: row.color.trim() || '(未命名颜色)',
					colorSwatch: row.colorSwatch,
					entries: [],
					gallery: [],
					pendingFiles: [],
					stockTotal: 0
				};
				map.set(key, group);
			}
			group.entries.push({ row, index });
			if (!group.colorSwatch && row.colorSwatch) group.colorSwatch = row.colorSwatch;
			for (const name of row.gallery ?? []) {
				if (!group.gallery.includes(name)) group.gallery.push(name);
			}
			for (const file of row.galleryFiles ?? []) {
				group.pendingFiles.push({ file, ownerIndex: index });
			}
			group.stockTotal += Number(row.stockQuantity) || 0;
		});
		return [...map.values()];
	});

	// One-time convergence: every row of a color carries the union gallery so
	// saves round-trip without divergence.
	let galleryNormalized = false;
	$effect(() => {
		if (galleryNormalized || variants.length === 0) return;
		galleryNormalized = true;
		const unionByColor = new SvelteMap<string, string[]>();
		for (const row of variants) {
			const key = colorKeyOf(row);
			const list = unionByColor.get(key) ?? [];
			for (const name of row.gallery ?? []) {
				if (!list.includes(name)) list.push(name);
			}
			unionByColor.set(key, list);
		}
		const needsFix = variants.some((row) => {
			const union = unionByColor.get(colorKeyOf(row)) ?? [];
			const current = [...(row.gallery ?? [])].sort();
			return JSON.stringify(current) !== JSON.stringify([...union].sort());
		});
		if (needsFix) {
			variants = variants.map((row) => ({
				...row,
				gallery: [...(unionByColor.get(colorKeyOf(row)) ?? [])].sort()
			}));
		}
	});

	// Generator collapsible state
	let showGenerator = $state(false);
	let selectedColorPresets = $state<ColorPreset[]>([]);
	let selectedSizes = $state<string[]>([]);
	let generatorDefaultStock = $state(15);
	// svelte-ignore state_referenced_locally
	let generatorPrefix = $state(productSlug || 'PROD');

	// Confirm-pending color deletion
	let confirmDeleteColor = $state<string | null>(null);

	// Manual SKU prefix overrides, keyed by color group (unset = auto-generate)
	const skuPrefixTouched = new SvelteSet<string>();
	const skuPrefixOverride = new SvelteMap<string, string>();

	// Inline size creator, keyed by color group
	let addingSizeFor = $state<string | null>(null);
	let newSizeName = $state('');
	let newSizeStock = $state(10);

	// Aggregates
	let totalStock = $derived(variants.reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0));

	let previewGeneratedCount = $derived(
		(selectedColorPresets.length > 0 ? selectedColorPresets.length : 1) *
			(selectedSizes.length > 0 ? selectedSizes.length : 1)
	);

	function skuPrefixOf(group: ColorGroup): string {
		if (skuPrefixTouched.has(group.key)) {
			return skuPrefixOverride.get(group.key) ?? autoSkuPrefixOf(group);
		}
		return autoSkuPrefixOf(group);
	}

	function autoSkuPrefixOf(group: ColorGroup): string {
		const base = productSlug || generatorPrefix || 'PROD';
		return `${sanitizeSkuSegment(base, 'PROD')}-${sanitizeSkuSegment(group.color, 'CLR')}`;
	}

	function applySkuPrefixInput(group: ColorGroup, raw: string) {
		const base = productSlug || generatorPrefix || 'PROD';
		if (!raw.trim()) {
			skuPrefixTouched.delete(group.key);
			skuPrefixOverride.delete(group.key);
			variants = variants.map((row) =>
				colorKeyOf(row) === group.key
					? { ...row, sku: generateSku(base, row.color, row.size || 'STD') }
					: row
			);
			return;
		}
		skuPrefixTouched.add(group.key);
		skuPrefixOverride.set(group.key, raw);
		variants = variants.map((row) =>
			colorKeyOf(row) === group.key
				? { ...row, sku: `${raw}-${sanitizeSkuSegment(row.size, 'STD')}` }
				: row
		);
	}

	function addColor() {
		const base = productSlug || generatorPrefix || 'PROD';
		variants = [
			...variants,
			{
				color: '新颜色',
				colorSwatch: '#18181b',
				size: 'ONE SIZE',
				sku: generateSku(base, '新颜色', 'ONE-SIZE'),
				stockQuantity: 10,
				gallery: []
			}
		];
	}

	function updateGroupColor(key: string, patch: { color?: string; colorSwatch?: string }) {
		if (patch.color !== undefined) {
			skuPrefixTouched.delete(key);
			skuPrefixOverride.delete(key);
		}
		variants = variants.map((row) =>
			colorKeyOf(row) === key ? { ...row, ...patch } : row
		);
	}

	function removeColor(key: string) {
		for (const row of variants) {
			if (colorKeyOf(row) === key) revokeRowPreviews(row);
		}
		variants = variants.filter((row) => colorKeyOf(row) !== key);
		confirmDeleteColor = null;
		skuPrefixTouched.delete(key);
		skuPrefixOverride.delete(key);
	}

	function duplicateColor(group: ColorGroup) {
		const base = productSlug || generatorPrefix || 'PROD';
		let finalColor = `${group.color} 副本`;
		let n = 2;
		while (variants.some((row) => colorKeyOf(row) === finalColor)) {
			finalColor = `${group.color} 副本 ${n}`;
			n += 1;
		}
		const copies = group.entries.map((entry) => ({
			color: finalColor,
			colorSwatch: entry.row.colorSwatch ?? group.colorSwatch,
			size: entry.row.size,
			sku: generateSku(base, finalColor, entry.row.size || 'STD'),
			stockQuantity: Number(entry.row.stockQuantity) || 0,
			gallery: [...(entry.row.gallery ?? [])]
		}));
		const insertAt = Math.max(...group.entries.map((entry) => entry.index)) + 1;
		variants = [...variants.slice(0, insertAt), ...copies, ...variants.slice(insertAt)];
	}

	function confirmAddSize(group: ColorGroup) {
		const size = newSizeName.trim();
		if (!size) return;
		if (group.entries.some((entry) => entry.row.size === size)) return;
		const base = productSlug || generatorPrefix || 'PROD';
		variants = [
			...variants,
			{
				color: group.color,
				colorSwatch: group.colorSwatch,
				size,
				sku: generateSku(base, group.color, size),
				stockQuantity: Math.max(0, Math.floor(Number(newSizeStock) || 0)),
				gallery: [...group.gallery]
			}
		];
		addingSizeFor = null;
		newSizeName = '';
		newSizeStock = 10;
	}

	function removeSize(index: number) {
		const row = variants[index];
		if (!row) return;
		const key = colorKeyOf(row);
		const files = row.galleryFiles ?? [];
		revokeRowPreviews(row);
		const rest = variants.filter((_, i) => i !== index);
		if (files.length > 0) {
			const sibling = rest.find((r) => colorKeyOf(r) === key);
			if (sibling) sibling.galleryFiles = [...(sibling.galleryFiles ?? []), ...files];
		}
		variants = [...rest];
	}

	function refreshSizeSku(index: number) {
		const row = variants[index];
		if (!row) return;
		const base = productSlug || generatorPrefix || 'PROD';
		variants[index] = {
			...row,
			sku: generateSku(base, row.color || 'CLR', row.size || 'STD')
		};
	}

	function modifyRowStock(index: number, delta: number) {
		const row = variants[index];
		if (!row) return;
		variants[index] = {
			...row,
			stockQuantity: adjustStock(row.stockQuantity, delta)
		};
	}

	// Local preview URLs for pending uploads (revoked on remove/submit).
	const previewCache = new SvelteMap<File, string>();

	function previewOf(file: File): string {
		let url = previewCache.get(file);
		if (!url) {
			url = URL.createObjectURL(file);
			previewCache.set(file, url);
		}
		return url;
	}

	function revokeRowPreviews(row: VariantRow | undefined) {
		for (const file of row?.galleryFiles ?? []) {
			const url = previewCache.get(file);
			if (url) {
				URL.revokeObjectURL(url);
				previewCache.delete(file);
			}
		}
	}

	function galleryCountOf(group: ColorGroup): number {
		return group.gallery.length + group.pendingFiles.length;
	}

	function addGroupGalleryFiles(group: ColorGroup, files: FileList | null) {
		if (!files || group.entries.length === 0) return;
		const first = group.entries[0];
		const room = MAX_GALLERY_PER_VARIANT - galleryCountOf(group);
		if (room <= 0) return;
		const accepted = [...files]
			.filter((file) => file.type.startsWith('image/') && file.size > 0)
			.slice(0, room);
		if (accepted.length === 0) return;
		const target = variants[first.index];
		if (!target) return;
		variants[first.index] = {
			...target,
			galleryFiles: [...(target.galleryFiles ?? []), ...accepted]
		};
	}

	function removeGroupGalleryImage(group: ColorGroup, name: string) {
		variants = variants.map((row) =>
			colorKeyOf(row) === group.key
				? { ...row, gallery: (row.gallery ?? []).filter((n) => n !== name) }
				: row
		);
	}

	function removeGroupGalleryFile(ownerIndex: number, file: File) {
		const row = variants[ownerIndex];
		if (!row) return;
		const url = previewCache.get(file);
		if (url) {
			URL.revokeObjectURL(url);
			previewCache.delete(file);
		}
		variants[ownerIndex] = {
			...row,
			galleryFiles: (row.galleryFiles ?? []).filter((f) => f !== file)
		};
	}

	function galleryUrl(variantId: string, name: string): string {
		return getFileUrl('product_variants', variantId, name, { thumb: '200x200' });
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

	function regenerateAllSkus() {
		const base = productSlug || generatorPrefix || 'PROD';
		variants = variants.map((row) => ({
			...row,
			sku: generateSku(base, row.color || 'CLR', row.size || 'STD')
		}));
	}

	const COMMON_QUICK_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'ONE SIZE'];
</script>

<div class="space-y-4">
	<!-- Top Controls Toolbar -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-50/80 p-3 rounded-2xl border border-zinc-200/80">
		<div class="flex items-center gap-2 flex-wrap">
			<span class="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
				<UiIcon icon={Layers} size={15} class="text-zinc-600" />
				规格变体管理
			</span>
			<span class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-white border border-zinc-200 text-zinc-700 shadow-2xs">
				{colorGroups.length} 颜色系列 · {variants.length} 规格组合
			</span>
			{#if variants.length > 0}
				<span class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border {totalStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}">
					总在库: {totalStock} 件
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			{#if variants.length > 1}
				<button
					type="button"
					onclick={regenerateAllSkus}
					title="根据当前产品代号统一重整所有规格 SKU"
					class="{ADMIN_BUTTONS.secondarySm} text-xs font-medium"
				>
					<UiIcon icon={RefreshCw} size={13} />
					统一重排 SKU
				</button>
			{/if}

			<button
				type="button"
				onclick={() => (showGenerator = !showGenerator)}
				class="{showGenerator ? ADMIN_BUTTONS.primarySm : ADMIN_BUTTONS.secondarySm} text-xs font-medium"
			>
				<UiIcon icon={Wand2} size={13} />
				<span>批量预设生成</span>
				{#if showGenerator}
					<UiIcon icon={ChevronUp} size={13} />
				{:else}
					<UiIcon icon={ChevronDown} size={13} />
				{/if}
			</button>

			<button type="button" onclick={addColor} class="{ADMIN_BUTTONS.primarySm} text-xs font-medium">
				<UiIcon icon={Plus} size={13} />
				添加新颜色
			</button>
		</div>
	</div>

	<!-- Collapsible Batch Generator Panel -->
	{#if showGenerator}
		<div class="p-5 rounded-2xl bg-zinc-50/90 border border-zinc-300 shadow-sm space-y-4">
			<div class="flex items-center justify-between border-b border-zinc-200/80 pb-3">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
						<UiIcon icon={Wand2} size={15} />
					</div>
					<div>
						<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-900">
							变体矩阵组合生成器
						</h3>
						<p class="text-[11px] text-zinc-500">
							勾选所需颜色与尺码预设，系统将自动进行笛卡尔乘积组合并生成规范 SKU
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={clearGeneratorSelections}
					class="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline cursor-pointer"
				>
					清空已选
				</button>
			</div>

			<!-- Step 1: Color Presets -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
						<span class="w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-mono">1</span>
						选择颜色预设 ({selectedColorPresets.length} 已选)
					</span>
				</div>

				<div class="flex flex-wrap gap-2">
					{#each DEFAULT_COLOR_PRESETS as preset (preset.name)}
						{@const isSelected = selectedColorPresets.some((c) => c.name === preset.name)}
						<button
							type="button"
							onclick={() => toggleColorPreset(preset)}
							class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer {isSelected
								? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
								: 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 shadow-2xs'}"
						>
							<span
								class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
								style="background-color: {preset.swatch};"
							></span>
							<span>{preset.name}</span>
							<span class="text-[10px] font-mono {isSelected ? 'text-zinc-300' : 'text-zinc-400'}">({preset.slug})</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Step 2: Size Presets -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
						<span class="w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-mono">2</span>
						选择尺码预设 ({selectedSizes.length} 已选)
					</span>
					<button
						type="button"
						onclick={selectApparelSizes}
						class="text-xs font-semibold text-zinc-700 hover:text-zinc-900 underline underline-offset-2 cursor-pointer"
					>
						快速勾选常规服装码 (S - XL)
					</button>
				</div>

				<div class="flex flex-wrap gap-2">
					{#each DEFAULT_SIZE_PRESETS as size (size)}
						{@const isSelected = selectedSizes.includes(size)}
						<button
							type="button"
							onclick={() => toggleSizePreset(size)}
							class="min-w-10 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer {isSelected
								? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
								: 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 shadow-2xs'}"
						>
							{size}
						</button>
					{/each}
				</div>
			</div>

			<!-- Step 3: Options & Action Bar -->
			<div class="pt-3.5 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
				<div class="flex items-center gap-3 w-full sm:w-auto">
					<div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-2xs">
						<span class="text-xs font-medium text-zinc-600">初始库存:</span>
						<input
							type="number"
							min="0"
							bind:value={generatorDefaultStock}
							class="w-16 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-zinc-900 outline-none focus:border-zinc-900 text-center"
						/>
						<span class="text-xs text-zinc-400">件</span>
					</div>
					<span class="text-xs text-zinc-500 font-medium">
						将生成 <strong class="font-mono text-zinc-900 text-sm">{previewGeneratedCount}</strong> 个变体规格
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
							覆盖生成规格矩阵
						{:else}
							一键生成规格矩阵
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Color Group Cards List -->
	{#if colorGroups.length > 0}
		<div class="space-y-4">
			{#each colorGroups as group (group.key)}
				<div class="bg-white rounded-2xl border border-zinc-200 shadow-xs hover:border-zinc-300 transition-all overflow-hidden">
					<!-- Card Header: Color Swatch + Name + SKU Prefix + Quick Stock + Actions -->
					<div class="bg-zinc-50/75 px-4 py-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<!-- Left controls -->
						<div class="flex items-center gap-3 flex-wrap">
							<!-- Color swatch circle with native picker -->
							<label
								class="relative w-8 h-8 rounded-full border-2 border-white shadow-xs ring-1 ring-zinc-200 cursor-pointer overflow-hidden flex items-center justify-center shrink-0 transition-transform hover:scale-105"
								title="点击更改此颜色色块"
							>
								<input
									type="color"
									value={group.colorSwatch || '#18181b'}
									oninput={(e) =>
										updateGroupColor(group.key, {
											colorSwatch: (e.target as HTMLInputElement).value
										})}
									class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
								/>
								<span
									class="w-full h-full"
									style="background-color: {group.colorSwatch || '#18181b'};"
								></span>
							</label>

							<!-- Color Name input -->
							<div class="flex items-center gap-1.5">
								<input
									value={group.color}
									oninput={(e) =>
										updateGroupColor(group.key, {
											color: (e.target as HTMLInputElement).value
										})}
									placeholder="颜色名称"
									aria-label="颜色名称"
									class="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors w-32 shadow-2xs"
								/>
							</div>

							<!-- SKU Prefix Input -->
							<div class="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-xs text-zinc-500 font-mono shadow-2xs">
								<span class="text-[10px] uppercase font-bold text-zinc-400">SKU前缀:</span>
								<input
									value={skuPrefixOf(group)}
									oninput={(e) =>
										applySkuPrefixInput(group, (e.target as HTMLInputElement).value)}
									placeholder="SKU 前缀"
									aria-label="SKU 前缀，可手动覆盖"
									spellcheck={false}
									class="bg-transparent border-none text-xs font-mono font-semibold text-zinc-800 outline-none w-28 p-0"
									title="自动生成，可手动覆盖修改"
								/>
							</div>

							<!-- Stock total badge for this color -->
							<span class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border {group.stockTotal > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}">
								小计: {group.stockTotal} 件
							</span>
						</div>

						<!-- Right action buttons -->
						<div class="flex items-center gap-1.5 self-end sm:self-auto">
							<button
								type="button"
								onclick={() => duplicateColor(group)}
								title="复制此颜色及全部尺码规格"
								aria-label="复制颜色"
								class="{ADMIN_BUTTONS.secondarySm} text-xs font-medium"
							>
								<UiIcon icon={Copy} size={13} />
								<span>复制系列</span>
							</button>

							{#if confirmDeleteColor === group.key}
								<div class="flex items-center gap-1.5 shrink-0">
									<button
										type="button"
										onclick={() => removeColor(group.key)}
										class={ADMIN_BUTTONS.dangerSolidSm}
									>
										确认删除
									</button>
									<button
										type="button"
										onclick={() => (confirmDeleteColor = null)}
										class={ADMIN_BUTTONS.secondarySm}
									>
										取消
									</button>
								</div>
							{:else}
								<button
									type="button"
									onclick={() => (confirmDeleteColor = group.key)}
									title="删除此颜色及其全部尺码规格"
									aria-label="删除颜色"
									class="{ADMIN_BUTTONS.danger} shrink-0"
								>
									<UiIcon icon={Trash2} size={15} />
								</button>
							{/if}
						</div>
					</div>

					<!-- Card Content: Two Column Split (Gallery Left, Sizes Right) -->
					<div class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
						<!-- Column 1: Color Gallery (3 or 4 cols) -->
						<div class="lg:col-span-4 xl:col-span-3 space-y-2.5 border-b lg:border-b-0 lg:border-r border-zinc-100 pb-4 lg:pb-0 lg:pr-4">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
									<UiIcon icon={ImageIcon} size={14} class="text-zinc-500" />
									专属图集
								</span>
								<span class="text-[11px] font-mono text-zinc-400">
									{group.gallery.length + group.pendingFiles.length} / {MAX_GALLERY_PER_VARIANT}
								</span>
							</div>

							<!-- 4 Thumbnail slots in neat grid -->
							<div class="grid grid-cols-4 gap-2">
								{#each group.gallery.slice(0, MAX_GALLERY_PER_VARIANT) as name (name)}
									{@const owner = group.entries[0]}
									<div class="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 group/thumb shadow-2xs">
										{#if owner?.row.id}
											<img
												src={galleryUrl(owner.row.id, name)}
												alt=""
												class="w-full h-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="w-full h-full flex items-center justify-center text-[9px] text-zinc-400 px-1 text-center break-all font-mono">
												{name}
											</div>
										{/if}
										<button
											type="button"
											onclick={() => removeGroupGalleryImage(group, name)}
											aria-label="移除图集图片"
											class="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900/80 text-white hidden group-hover/thumb:flex items-center justify-center cursor-pointer transition-opacity hover:bg-rose-600 shadow-xs"
										>
											<UiIcon icon={X} size={10} />
										</button>
									</div>
								{/each}

								{#each group.pendingFiles as item (item.file.name + item.file.size + item.file.lastModified)}
									<div class="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-zinc-400 bg-zinc-50 group/thumb shadow-2xs">
										<img src={previewOf(item.file)} alt="" class="w-full h-full object-cover" />
										<button
											type="button"
											onclick={() => removeGroupGalleryFile(item.ownerIndex, item.file)}
											aria-label="移除待上传图片"
											class="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900/80 text-white hidden group-hover/thumb:flex items-center justify-center cursor-pointer transition-opacity hover:bg-rose-600 shadow-xs"
										>
											<UiIcon icon={X} size={10} />
										</button>
									</div>
								{/each}

								{#each Array.from({ length: Math.max(0, MAX_GALLERY_PER_VARIANT - group.gallery.length - group.pendingFiles.length) }) as _, slotIndex (slotIndex)}
									<label
										class="aspect-square rounded-xl border-2 border-dashed border-zinc-200 hover:border-zinc-900 text-zinc-400 hover:text-zinc-900 flex flex-col items-center justify-center gap-1 shrink-0 cursor-pointer transition-colors bg-zinc-50/50 hover:bg-white"
										title="添加图片"
									>
										<UiIcon icon={ImagePlus} size={15} />
										<input
											type="file"
											accept="image/jpeg,image/png,image/webp,image/avif"
											multiple
											class="hidden"
											onchange={(e) => {
												addGroupGalleryFiles(group, (e.target as HTMLInputElement).files);
												(e.target as HTMLInputElement).value = '';
											}}
										/>
									</label>
								{/each}
							</div>

							<p class="text-[11px] text-zinc-400 leading-relaxed pt-0.5">
								前台商品详情页中，买家选中该颜色时会自动联动展示这组专属图片。
							</p>
						</div>

						<!-- Column 2: Sizes & Stock Matrix (8 or 9 cols) -->
						<div class="lg:col-span-8 xl:col-span-9 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
									<UiIcon icon={Layers} size={14} class="text-zinc-500" />
									尺码与实时库存明细
								</span>
								<span class="text-[11px] font-mono text-zinc-400">
									共 {group.entries.length} 个尺码规格
								</span>
							</div>

							<!-- Size Cards Grid -->
							<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
								{#each group.entries as entry (entry.index)}
									<div class="bg-zinc-50/70 hover:bg-white border border-zinc-200/90 hover:border-zinc-300 rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all shadow-2xs hover:shadow-xs group/size">
										<!-- Top row: Size Label + SKU + Refresh SKU + Remove -->
										<div class="flex items-center justify-between gap-2">
											<div class="flex items-center gap-2 min-w-0">
												<input
													value={entry.row.size}
													oninput={(e) => {
														const next = (e.target as HTMLInputElement).value;
														const row = variants[entry.index];
														if (row) variants[entry.index] = { ...row, size: next };
													}}
													class="bg-white border border-zinc-200 font-bold text-xs text-zinc-900 rounded-lg px-2 py-0.5 w-16 text-center outline-none focus:border-zinc-900 shadow-2xs"
													placeholder="尺码"
													title="可直接修改尺码名称"
												/>
												<span class="text-[10px] font-mono text-zinc-400 truncate" title={entry.row.sku}>
													{entry.row.sku || 'SKU待生成'}
												</span>
											</div>

											<div class="flex items-center gap-1">
												<button
													type="button"
													onclick={() => refreshSizeSku(entry.index)}
													title="重新生成此尺码 SKU"
													aria-label="刷新 SKU"
													class="text-zinc-300 hover:text-zinc-700 p-0.5 rounded transition-colors cursor-pointer opacity-0 group-hover/size:opacity-100"
												>
													<UiIcon icon={RefreshCw} size={11} />
												</button>
												<button
													type="button"
													onclick={() => removeSize(entry.index)}
													class="text-zinc-300 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer opacity-60 group-hover/size:opacity-100"
													title="删除此尺码"
													aria-label="删除此尺码"
												>
													<UiIcon icon={X} size={13} />
												</button>
											</div>
										</div>

										<!-- Bottom row: Direct Stock Stepper -->
										<div class="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
											<span class="text-[11px] text-zinc-500 font-medium">库存:</span>
											<div class="flex items-center gap-1">
												<button
													type="button"
													onclick={() => modifyRowStock(entry.index, -1)}
													class="w-6 h-6 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer disabled:opacity-30 shadow-2xs"
													disabled={Number(entry.row.stockQuantity) <= 0}
													title="库存 -1"
												>
													-
												</button>
												<input
													type="number"
													min="0"
													step="1"
													value={entry.row.stockQuantity}
													oninput={(e) => {
														const next = variants[entry.index];
														if (next)
															variants[entry.index] = {
																...next,
																stockQuantity: Math.max(0, Math.floor(Number((e.target as HTMLInputElement).value) || 0))
															};
													}}
													class="w-14 h-6 bg-white border border-zinc-200 rounded-lg text-center text-xs font-mono font-bold text-zinc-900 outline-none focus:border-zinc-900 shadow-2xs"
												/>
												<button
													type="button"
													onclick={() => modifyRowStock(entry.index, 1)}
													class="w-6 h-6 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shadow-2xs"
													title="库存 +1"
												>
													+
												</button>
												<button
													type="button"
													onclick={() => modifyRowStock(entry.index, 10)}
													class="h-6 px-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-mono font-semibold transition-colors cursor-pointer ml-1"
													title="快捷补充 10 件库存"
												>
													+10
												</button>
											</div>
										</div>
									</div>
								{/each}

								<!-- Add Size Tile (Inline) -->
								{#if addingSizeFor === group.key}
									<div class="bg-white border-2 border-zinc-900 rounded-xl p-3 flex flex-col justify-between gap-2.5 shadow-xs">
										<div class="space-y-1.5">
											<div class="flex items-center justify-between">
												<span class="text-[11px] font-bold text-zinc-800">新建尺码规格</span>
												<button
													type="button"
													onclick={() => (addingSizeFor = null)}
													class="text-zinc-400 hover:text-zinc-700 cursor-pointer"
													aria-label="关闭"
												>
													<UiIcon icon={X} size={12} />
												</button>
											</div>

											<div class="flex items-center gap-2">
												<input
													bind:value={newSizeName}
													placeholder="如 L 或 42"
													onkeydown={(e) => {
														if (e.key === 'Enter') confirmAddSize(group);
														if (e.key === 'Escape') addingSizeFor = null;
													}}
													class="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
												/>
												<input
													type="number"
													min="0"
													bind:value={newSizeStock}
													placeholder="库存"
													class="w-16 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-zinc-900 outline-none focus:border-zinc-900 text-center"
												/>
											</div>

											<!-- Quick Preset Pills -->
											<div class="flex flex-wrap gap-1 pt-0.5">
												{#each COMMON_QUICK_SIZES as qs (qs)}
													<button
														type="button"
														onclick={() => (newSizeName = qs)}
														class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer transition-colors"
													>
														{qs}
													</button>
												{/each}
											</div>
										</div>

										<div class="flex items-center gap-1.5 pt-1 border-t border-zinc-100">
											<button
												type="button"
												onclick={() => confirmAddSize(group)}
												disabled={!newSizeName.trim()}
												class="flex-1 py-1 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer"
											>
												确认添加
											</button>
											<button
												type="button"
												onclick={() => (addingSizeFor = null)}
												class="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-medium hover:bg-zinc-200 transition-colors cursor-pointer"
											>
												取消
											</button>
										</div>
									</div>
								{:else}
									<button
										type="button"
										onclick={() => {
											addingSizeFor = group.key;
											newSizeName = '';
											newSizeStock = 10;
										}}
										class="min-h-[82px] border-2 border-dashed border-zinc-200 hover:border-zinc-900 bg-zinc-50/40 hover:bg-white rounded-xl flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-zinc-900 cursor-pointer transition-all p-3"
									>
										<div class="w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center">
											<UiIcon icon={Plus} size={13} />
										</div>
										<span class="text-xs font-semibold">添加尺码</span>
									</button>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Empty State with Quick Starter -->
		<div class="py-12 px-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-white space-y-4 shadow-xs">
			<div class="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
				<UiIcon icon={Layers} size={24} />
			</div>
			<div class="space-y-1 max-w-md mx-auto">
				<h3 class="text-sm font-bold text-zinc-900 uppercase tracking-wider">当前暂未配置细分规格</h3>
				<p class="text-xs text-zinc-500 leading-relaxed">
					若无细分规格，商品将直接按单一整体库存销售。如需售卖不同颜色或尺码，可点击下方一键开启预设配置。
				</p>
			</div>

			<div class="flex items-center justify-center gap-3 pt-2">
				<button
					type="button"
					onclick={() => {
						showGenerator = true;
						selectApparelSizes();
					}}
					class={ADMIN_BUTTONS.primary}
				>
					<UiIcon icon={Wand2} size={14} />
					一键开启服装规格预设 (S - XL)
				</button>
				<button
					type="button"
					onclick={addColor}
					class={ADMIN_BUTTONS.secondary}
				>
					<UiIcon icon={Plus} size={14} />
					手动添加自定义颜色
				</button>
			</div>
		</div>
	{/if}
</div>
