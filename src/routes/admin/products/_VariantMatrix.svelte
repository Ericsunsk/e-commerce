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
	import {
		getFileUrl,
		ADMIN_MATRIX,
		ADMIN_TABLE,
		ADMIN_BUTTONS,
		ADMIN_BADGES
	} from '$shared/kernel';
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
		price?: number;
		compareAt?: number;
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
	let generatorDefaultPrice = $state<number | string>('');
	let generatorDefaultCompareAt = $state<number | string>('');
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
	let newSizePrice = $state<number | string>('');
	let newSizeCompareAt = $state<number | string>('');

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
		const firstVariant = variants[0];
		variants = [
			...variants,
			{
				color: '新颜色',
				colorSwatch: '#18181b',
				size: 'ONE SIZE',
				sku: generateSku(base, '新颜色', 'ONE-SIZE'),
				stockQuantity: 10,
				...(firstVariant?.price !== undefined ? { price: firstVariant.price } : {}),
				...(firstVariant?.compareAt !== undefined ? { compareAt: firstVariant.compareAt } : {}),
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
			...(entry.row.price !== undefined ? { price: entry.row.price } : {}),
			...(entry.row.compareAt !== undefined ? { compareAt: entry.row.compareAt } : {}),
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
		const firstRow = group.entries[0]?.row;
		const p = newSizePrice !== '' ? Number(newSizePrice) : firstRow?.price;
		const cp = newSizeCompareAt !== '' ? Number(newSizeCompareAt) : firstRow?.compareAt;
		variants = [
			...variants,
			{
				color: group.color,
				colorSwatch: group.colorSwatch,
				size,
				sku: generateSku(base, group.color, size),
				stockQuantity: Math.max(0, Math.floor(Number(newSizeStock) || 0)),
				...(p !== undefined && Number.isFinite(p) ? { price: p } : {}),
				...(cp !== undefined && Number.isFinite(cp) ? { compareAt: cp } : {}),
				gallery: [...group.gallery]
			}
		];
		addingSizeFor = null;
		newSizeName = '';
		newSizeStock = 10;
		newSizePrice = '';
		newSizeCompareAt = '';
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

	function galleryZoomUrl(variantId: string, name: string): string {
		return getFileUrl('product_variants', variantId, name, { thumb: '600x600' });
	}

	interface GallerySlotItem {
		kind: 'existing' | 'pending';
		name?: string;
		file?: File;
		ownerIndex?: number;
		url: string;
		zoomUrl: string;
	}

	function getGroupGallerySlots(group: ColorGroup): GallerySlotItem[] {
		const owner = group.entries[0];
		const items: GallerySlotItem[] = [];

		for (const name of group.gallery.slice(0, MAX_GALLERY_PER_VARIANT)) {
			items.push({
				kind: 'existing',
				name,
				url: owner?.row.id ? galleryUrl(owner.row.id, name) : '',
				zoomUrl: owner?.row.id ? galleryZoomUrl(owner.row.id, name) : ''
			});
		}

		for (const item of group.pendingFiles) {
			if (items.length >= MAX_GALLERY_PER_VARIANT) break;
			const pUrl = previewOf(item.file);
			items.push({
				kind: 'pending',
				file: item.file,
				ownerIndex: item.ownerIndex,
				url: pUrl,
				zoomUrl: pUrl
			});
		}

		return items;
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
		const parsedPrice =
			generatorDefaultPrice !== '' && !isNaN(Number(generatorDefaultPrice))
				? Number(generatorDefaultPrice)
				: undefined;
		const parsedCompareAt =
			generatorDefaultCompareAt !== '' && !isNaN(Number(generatorDefaultCompareAt))
				? Number(generatorDefaultCompareAt)
				: undefined;
		const generated = generateVariantMatrix({
			productSlug: base,
			colors: selectedColorPresets,
			sizes: selectedSizes,
			defaultStock: generatorDefaultStock,
			defaultPrice: parsedPrice,
			defaultCompareAt: parsedCompareAt
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
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
		<div class="flex items-center gap-2 flex-wrap">
			<span class="text-xs font-bold text-zinc-900 tracking-wide uppercase">
				规格矩阵清单
			</span>
			<span class="text-xs text-zinc-500 font-mono">
				({colorGroups.length} 颜色 · {variants.length} 细分规格 · 共 {totalStock} 件在库)
			</span>
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			{#if variants.length > 1}
				<button
					type="button"
					onclick={regenerateAllSkus}
					title="根据产品代号重新生成所有规格 SKU"
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 hover:border-zinc-300 text-xs font-medium transition-colors cursor-pointer"
				>
					<UiIcon icon={RefreshCw} size={12} />
					<span>重整 SKU</span>
				</button>
			{/if}

			<button
				type="button"
				onclick={() => (showGenerator = !showGenerator)}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer {showGenerator ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:border-zinc-300'}"
			>
				<UiIcon icon={Wand2} size={12} />
				<span>预设批量生成</span>
				{#if showGenerator}
					<UiIcon icon={ChevronUp} size={12} />
				{:else}
					<UiIcon icon={ChevronDown} size={12} />
				{/if}
			</button>

			<button
				type="button"
				onclick={addColor}
				class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer"
			>
				<UiIcon icon={Plus} size={13} />
				<span>添加颜色</span>
			</button>
		</div>
	</div>

	<!-- Collapsible Batch Generator Panel -->
	{#if showGenerator}
		<div class={ADMIN_MATRIX.generatorCard}>
			<div class="flex items-center justify-between border-b border-zinc-200/80 pb-2.5">
				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-900">
						变体矩阵组合生成器
					</h3>
					<p class="text-[11px] text-zinc-500">
						勾选预设颜色与尺码，系统自动进行笛卡尔组合并生成标准 SKU
					</p>
				</div>

				<button
					type="button"
					onclick={clearGeneratorSelections}
					class="text-xs font-medium text-zinc-400 hover:text-zinc-800 cursor-pointer"
				>
					清空已选
				</button>
			</div>

			<!-- Step 1: Color Presets -->
			<div class="space-y-1.5">
				<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
					1. 选择颜色 ({selectedColorPresets.length} 已选)
				</span>
				<div class="flex flex-wrap gap-1.5">
					{#each DEFAULT_COLOR_PRESETS as preset (preset.name)}
						{@const isSelected = selectedColorPresets.some((c) => c.name === preset.name)}
						<button
							type="button"
							onclick={() => toggleColorPreset(preset)}
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer {isSelected
								? 'bg-zinc-900 border-zinc-900 text-white'
								: 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'}"
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

			<!-- Step 2: Size Presets -->
			<div class="space-y-1.5">
				<div class="flex items-center justify-between">
					<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
						2. 选择尺码 ({selectedSizes.length} 已选)
					</span>
					<button
						type="button"
						onclick={selectApparelSizes}
						class="text-xs font-semibold text-zinc-600 hover:text-zinc-900 underline cursor-pointer"
					>
						快速勾选 S - XL
					</button>
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each DEFAULT_SIZE_PRESETS as size (size)}
						{@const isSelected = selectedSizes.includes(size)}
						<button
							type="button"
							onclick={() => toggleSizePreset(size)}
							class="min-w-9 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer {isSelected
								? 'bg-zinc-900 border-zinc-900 text-white'
								: 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'}"
						>
							{size}
						</button>
					{/each}
				</div>
			</div>

			<!-- Step 3: Generator Footer -->
			<div class="pt-2.5 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
				<div class="flex items-center gap-3 flex-wrap">
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-zinc-600 font-medium">默认售价:</span>
						<div class="relative w-20">
							<span class="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs pointer-events-none">$</span>
							<input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								bind:value={generatorDefaultPrice}
								class="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 rounded-lg pl-5 pr-1.5 py-0.5 text-xs font-mono font-medium text-zinc-900 outline-none transition-colors"
							/>
						</div>
					</div>

					<div class="flex items-center gap-1.5">
						<span class="text-xs text-zinc-600 font-medium">划线原价:</span>
						<div class="relative w-20">
							<span class="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs pointer-events-none">$</span>
							<input
								type="number"
								min="0"
								step="0.01"
								placeholder="选填"
								bind:value={generatorDefaultCompareAt}
								class="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 rounded-lg pl-5 pr-1.5 py-0.5 text-xs font-mono font-medium text-zinc-900 outline-none transition-colors"
							/>
						</div>
					</div>

					<div class="flex items-center gap-1.5">
						<span class="text-xs text-zinc-600 font-medium">初始库存:</span>
						<input
							type="number"
							min="0"
							bind:value={generatorDefaultStock}
							class={ADMIN_MATRIX.generatorStock}
						/>
						<span class="text-xs text-zinc-400">件</span>
					</div>
					<span class="text-xs text-zinc-500">
						将生成 <strong class="font-mono text-zinc-900">{previewGeneratedCount}</strong> 个变体规格
					</span>
				</div>

				<div class="flex items-center gap-2">
					{#if variants.length > 0}
						<button
							type="button"
							onclick={() => applyGeneratedMatrix('append')}
							disabled={selectedColorPresets.length === 0 && selectedSizes.length === 0}
							class="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-semibold cursor-pointer disabled:opacity-40"
						>
							追加到现有规格
						</button>
					{/if}

					<button
						type="button"
						onclick={() => applyGeneratedMatrix('replace')}
						disabled={selectedColorPresets.length === 0 && selectedSizes.length === 0}
						class="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
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

	<!-- Color Tables List -->
	{#if colorGroups.length > 0}
		<div class="space-y-4">
			{#each colorGroups as group (group.key)}
				{@const gallerySlots = getGroupGallerySlots(group)}
				<div class={ADMIN_MATRIX.colorCard}>
					<!-- Color Banner Header -->
					<div class="bg-zinc-50/70 border-b border-zinc-200/80 rounded-t-xl px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
						<!-- Left: Color Swatch + Color Name + SKU Prefix -->
						<div class="flex items-center gap-3 flex-wrap">
							<!-- Color swatch circle with native picker -->
							<label
								class="relative w-6 h-6 rounded-full border border-black/15 cursor-pointer overflow-hidden flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
								title="点击修改色值"
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
							<input
								value={group.color}
								oninput={(e) =>
									updateGroupColor(group.key, {
										color: (e.target as HTMLInputElement).value
									})}
								placeholder="颜色名称"
								class={ADMIN_MATRIX.colorName}
							/>

							<!-- SKU Prefix Input: auto-width based on value -->
							<input
								value={skuPrefixOf(group)}
								oninput={(e) =>
									applySkuPrefixInput(group, (e.target as HTMLInputElement).value)}
								placeholder="SKU"
								spellcheck={false}
								style="width: {Math.max(6, (skuPrefixOf(group) || 'SKU').length + 2)}ch;"
								class={ADMIN_MATRIX.skuPrefix}
								title="SKU 前缀（自动生成，可手动覆盖修改）"
							/>

							<!-- Compact 4-Photo Gallery Strip (No divider line) -->
							<div class="flex items-center gap-1.5" title="该颜色专属图集（前台选中该颜色时联动，最多 4 张）">
								{#each gallerySlots as item}
									<div class="relative w-8 h-8 rounded-lg border border-zinc-200 bg-zinc-100 group/thumb shrink-0">
										{#if item.url}
											<img
												src={item.url}
												alt=""
												class="w-full h-full object-cover rounded-lg"
												loading="lazy"
											/>
										{:else}
											<div class="w-full h-full flex items-center justify-center text-[8px] text-zinc-400 font-mono">
												IMG
											</div>
										{/if}

										<!-- Floating enlarged preview on hover -->
										{#if item.url}
											<div
												class="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover/thumb:block z-50 animate-in fade-in zoom-in-95 duration-100"
											>
												<div class="bg-white border border-zinc-200 rounded-xl p-1.5 w-48 h-48 flex items-center justify-center">
													<img
														src={item.zoomUrl || item.url}
														alt=""
														class="w-full h-full object-cover rounded-lg bg-zinc-50"
													/>
												</div>
											</div>
										{/if}

										<!-- Remove button on hover -->
										<button
											type="button"
											onclick={() => {
												if (item.kind === 'existing' && item.name) {
													removeGroupGalleryImage(group, item.name);
												} else if (item.kind === 'pending' && item.file && item.ownerIndex !== undefined) {
													removeGroupGalleryFile(item.ownerIndex, item.file);
												}
											}}
											aria-label="移除图片"
											title="移除图片"
											class="absolute inset-0 bg-black/60 text-white rounded-lg opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-10"
										>
											<UiIcon icon={X} size={11} />
										</button>
									</div>
								{/each}

								{#each Array.from({ length: Math.max(0, MAX_GALLERY_PER_VARIANT - gallerySlots.length) }) as _, slotIdx (slotIdx)}
									<label
										class="w-8 h-8 rounded-lg border border-dashed border-zinc-300 hover:border-zinc-800 text-zinc-400 hover:text-zinc-800 flex items-center justify-center shrink-0 cursor-pointer transition-colors bg-white"
										title="上传颜色图集（最多 4 张）"
									>
										<UiIcon icon={ImagePlus} size={13} />
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
						</div>

						<!-- Right: Actions -->
						<div class="flex items-center gap-2 self-end md:self-auto">
							<span class={ADMIN_BADGES.neutral}>
								在库: {group.stockTotal} 件
							</span>

							<button
								type="button"
								onclick={() => duplicateColor(group)}
								title="复制此颜色及全部尺码规格"
								class={ADMIN_BUTTONS.secondarySm}
							>
								<UiIcon icon={Copy} size={11} />
								<span>复制</span>
							</button>

							{#if confirmDeleteColor === group.key}
								<div class="flex items-center gap-1 shrink-0">
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
									title="删除此颜色系列"
									class={ADMIN_BUTTONS.secondarySm}
								>
									<UiIcon icon={Trash2} size={11} />
									<span>删除</span>
								</button>
							{/if}
						</div>
					</div>

					<!-- Clean Sizes Table -->
					<div class={ADMIN_TABLE.wrapper}>
						<table class={ADMIN_TABLE.table}>
							<thead>
								<tr class={ADMIN_TABLE.headerRow}>
									<th class="{ADMIN_TABLE.headerCell} w-28">尺码 (Size)</th>
									<th class="{ADMIN_TABLE.headerCell} w-32">当前售价 ($)</th>
									<th class="{ADMIN_TABLE.headerCell} w-32">划线原价 ($)</th>
									<th class={ADMIN_TABLE.headerCell}>完整 SKU 编码</th>
									<th class="{ADMIN_TABLE.headerCell} w-56">在库库存 (Stock)</th>
									<th class="{ADMIN_TABLE.headerCell} w-14 text-right">操作</th>
								</tr>
							</thead>
							<tbody class={ADMIN_TABLE.body}>
								{#each group.entries as entry (entry.index)}
									<tr class="{ADMIN_TABLE.row} group/row">
										<!-- Size Name Input -->
										<td class={ADMIN_TABLE.cell}>
											<input
												value={entry.row.size}
												oninput={(e) => {
													const next = (e.target as HTMLInputElement).value;
													const row = variants[entry.index];
													if (row) variants[entry.index] = { ...row, size: next };
												}}
												class={ADMIN_MATRIX.size}
												placeholder="尺码"
											/>
										</td>

										<!-- Current Price ($) Input -->
										<td class={ADMIN_TABLE.cell}>
											<div class="relative w-28">
												<span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs pointer-events-none">$</span>
												<input
													type="number"
													min="0"
													step="0.01"
													value={entry.row.price ?? ''}
													oninput={(e) => {
														const raw = (e.target as HTMLInputElement).value;
														const row = variants[entry.index];
														if (row)
															variants[entry.index] = {
																...row,
																price: raw === '' ? undefined : Number(raw)
															};
													}}
													placeholder="0.00"
													class={ADMIN_MATRIX.variantPrice}
													title="此规格实付售价"
												/>
											</div>
										</td>

										<!-- Compare At Price ($) Input -->
										<td class={ADMIN_TABLE.cell}>
											<div class="relative w-28">
												<span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs pointer-events-none">$</span>
												<input
													type="number"
													min="0"
													step="0.01"
													value={entry.row.compareAt ?? ''}
													oninput={(e) => {
														const raw = (e.target as HTMLInputElement).value;
														const row = variants[entry.index];
														if (row)
															variants[entry.index] = {
																...row,
																compareAt: raw === '' ? undefined : Number(raw)
															};
													}}
													placeholder="选填"
													class={ADMIN_MATRIX.variantPrice}
													title="划线建议原价（选填）"
												/>
											</div>
										</td>

										<!-- SKU Display + Refresh -->
										<td class="{ADMIN_TABLE.cell} font-mono text-zinc-600">
											<div class="flex items-center gap-1.5">
												<span>{entry.row.sku || '—'}</span>
												<button
													type="button"
													onclick={() => refreshSizeSku(entry.index)}
													title="根据前缀重新生成此 SKU"
													class="text-zinc-300 hover:text-zinc-700 opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer p-0.5"
												>
													<UiIcon icon={RefreshCw} size={11} />
												</button>
											</div>
										</td>

										<!-- Stock Stepper Controls -->
										<td class={ADMIN_TABLE.cell}>
											<div class="flex items-center gap-1">
												<button
													type="button"
													onclick={() => modifyRowStock(entry.index, -1)}
													disabled={Number(entry.row.stockQuantity) <= 0}
													class="w-7 h-7 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer transition-colors"
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
													class={ADMIN_MATRIX.stock}
												/>
												<button
													type="button"
													onclick={() => modifyRowStock(entry.index, 1)}
													class="w-7 h-7 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
													title="库存 +1"
												>
													+
												</button>
												<button
													type="button"
													onclick={() => modifyRowStock(entry.index, 10)}
													class="h-7 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 text-[11px] font-mono font-medium transition-colors cursor-pointer ml-1"
													title="快捷补充 10 件库存"
												>
													+10
												</button>
											</div>
										</td>

										<!-- Remove Size -->
										<td class="{ADMIN_TABLE.cell} text-right">
											<button
												type="button"
												onclick={() => removeSize(entry.index)}
												class="text-zinc-300 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
												title="删除此规格"
												aria-label="删除此规格"
											>
												<UiIcon icon={X} size={14} />
											</button>
										</td>
									</tr>
								{/each}

								<!-- Quick Add Size Row inside the table -->
								<tr class="bg-zinc-50/30">
									<td colspan="6" class={ADMIN_TABLE.cell}>
										{#if addingSizeFor === group.key}
											<div class="flex items-center gap-2 py-0.5 flex-wrap">
												<span class="text-xs font-semibold text-zinc-700">新尺码:</span>
												<input
													bind:value={newSizeName}
													placeholder="如 L 或 42"
													class={ADMIN_MATRIX.newSize}
													onkeydown={(e) => {
														if (e.key === 'Enter') confirmAddSize(group);
														if (e.key === 'Escape') addingSizeFor = null;
													}}
												/>
												<span class="text-xs font-medium text-zinc-500 ml-1">售价:</span>
												<div class="relative w-20">
													<span class="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs pointer-events-none">$</span>
													<input
														type="number"
														min="0"
														step="0.01"
														bind:value={newSizePrice}
														placeholder="售价"
														class="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 rounded-lg pl-5 pr-1 py-1 text-xs font-mono text-zinc-900 outline-none"
													/>
												</div>
												<span class="text-xs font-medium text-zinc-500 ml-1">原价:</span>
												<div class="relative w-20">
													<span class="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs pointer-events-none">$</span>
													<input
														type="number"
														min="0"
														step="0.01"
														bind:value={newSizeCompareAt}
														placeholder="选填"
														class="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 rounded-lg pl-5 pr-1 py-1 text-xs font-mono text-zinc-900 outline-none"
													/>
												</div>
												<span class="text-xs font-medium text-zinc-500 ml-1">初始库存:</span>
												<input
													type="number"
													min="0"
													bind:value={newSizeStock}
													class={ADMIN_MATRIX.newStock}
												/>
												<div class="flex items-center gap-1 ml-1">
													{#each COMMON_QUICK_SIZES as qs (qs)}
														<button
															type="button"
															onclick={() => (newSizeName = qs)}
															class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 cursor-pointer transition-colors"
														>
															{qs}
														</button>
													{/each}
												</div>
												<div class="flex items-center gap-1.5 ml-auto">
													<button
														type="button"
														onclick={() => confirmAddSize(group)}
														disabled={!newSizeName.trim()}
														class="px-3 py-1 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 disabled:opacity-40 cursor-pointer transition-colors"
													>
														确认添加
													</button>
													<button
														type="button"
														onclick={() => (addingSizeFor = null)}
														class="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-medium hover:bg-zinc-200 cursor-pointer transition-colors"
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
													const first = group.entries[0]?.row;
													newSizePrice = first?.price !== undefined ? first.price : '';
													newSizeCompareAt = first?.compareAt !== undefined ? first.compareAt : '';
												}}
												class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer transition-colors py-0.5"
											>
												<UiIcon icon={Plus} size={13} class="text-zinc-500" />
												<span>为此颜色添加尺码规格...</span>
											</button>
										{/if}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Clean Empty State -->
		<div class="py-10 px-6 text-center border border-dashed border-zinc-200 rounded-xl bg-white space-y-3">
			<div class="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
				<UiIcon icon={Layers} size={20} />
			</div>
			<div class="space-y-1 max-w-sm mx-auto">
				<h4 class="text-xs font-bold text-zinc-800 uppercase tracking-wider">暂无细分商品规格</h4>
				<p class="text-[11px] text-zinc-400">
					未设置多规格时，商品将按单一统一库存售卖。点击下方按钮即可快速配置颜色与尺码。
				</p>
			</div>

			<div class="flex items-center justify-center gap-2 pt-1">
				<button
					type="button"
					onclick={() => {
						showGenerator = true;
						selectApparelSizes();
					}}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium cursor-pointer transition-colors"
				>
					<UiIcon icon={Wand2} size={12} />
					<span>快速填充服装常用码 (S-XL)</span>
				</button>
				<button
					type="button"
					onclick={addColor}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 text-xs font-medium cursor-pointer transition-colors"
				>
					<UiIcon icon={Plus} size={12} />
					<span>添加新颜色</span>
				</button>
			</div>
		</div>
	{/if}
</div>
