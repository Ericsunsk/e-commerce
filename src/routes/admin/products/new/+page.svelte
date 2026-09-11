<script lang="ts">
	import {
		ArrowLeft,
		CircleAlert,
		FileText,
		Tag,
		Layers
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { goto } from '$app/navigation';
	import {
		ADMIN_PAGE,
		ADMIN_CARDS,
		ADMIN_BADGES,
		ADMIN_FORMS,
		ADMIN_BUTTONS,
		ICONS
	} from '$shared/kernel';
	import type { PageData } from './$types';
	import VariantMatrix, { type VariantRow } from '../_VariantMatrix.svelte';
	import { groupCategoriesByHierarchy } from '$domains/catalog';

	let { data }: { data: PageData } = $props();

	let title = $state('');
	let description = $state('');
	let material = $state('');
	let care = $state('');
	let detailsText = $state('');
	let price = $state('');
	let compareAt = $state('');
	let currency = $state('USD');
	let isActive = $state(true);
	let isFeatured = $state(false);
	let selectedCategories = $state<string[]>([]);
	let categoryTierGroups = $derived(groupCategoriesByHierarchy(data.categories || []));
	let variants = $state<VariantRow[]>([]);

	// First SKU / Variant Image (drives product cover image)
	let firstVariantImage = $derived.by(() => {
		for (const v of variants) {
			if (v.galleryFiles && v.galleryFiles.length > 0) {
				return URL.createObjectURL(v.galleryFiles[0]);
			}
		}
		return '';
	});

	let saving = $state(false);
	let error = $state('');

	let effectivePrice = $derived(
		price !== ''
			? Number(price)
			: (variants.find((v) => v.price !== undefined && Number(v.price) > 0)?.price ?? 0)
	);
	let isFormValid = $derived(title.trim().length >= 2 && effectivePrice > 0);
	let totalStock = $derived(variants.reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0));

	function toggleCategory(catId: string) {
		if (selectedCategories.includes(catId)) {
			selectedCategories = selectedCategories.filter((id) => id !== catId);
		} else {
			selectedCategories = [...selectedCategories, catId];
		}
	}

	function resetForm() {
		title = '';
		description = '';
		material = '';
		care = '';
		detailsText = '';
		price = '';
		compareAt = '';
		currency = 'USD';
		isActive = true;
		isFeatured = false;
		selectedCategories = [];
		variants = [];
		error = '';
	}

	async function submit() {
		saving = true;
		error = '';

		try {
			const fallbackVariantPrice = variants.reduce<number | undefined>((min, v) => {
				if (v.price === undefined) return min;
				return min === undefined ? v.price : Math.min(min, v.price);
			}, undefined);
			const fallbackVariantCompareAt = variants.reduce<number | undefined>((min, v) => {
				if (v.compareAt === undefined) return min;
				return min === undefined ? v.compareAt : Math.min(min, v.compareAt);
			}, undefined);

			const payload = {
				title,
				description,
				material,
				care,
				details: detailsText
					.split('\n')
					.map((line: string) => line.trim())
					.filter((line: string) => line.length > 0),
				price: price !== '' ? Number(price) : fallbackVariantPrice,
				compare_at_price: compareAt !== '' ? Number(compareAt) : (fallbackVariantCompareAt ?? null),
				currency,
				is_active: isActive,
				is_featured: isFeatured,
				category: selectedCategories,
				variants: variants.map((v) => ({
					color: v.color,
					colorSwatch: v.colorSwatch,
					size: v.size,
					sku: v.sku,
					stockQuantity: Number(v.stockQuantity),
					...(v.price !== undefined ? { price: Number(v.price) } : {}),
					...(v.compareAt !== undefined ? { compareAt: Number(v.compareAt) } : {}),
					gallery: v.gallery ?? []
				}))
			};
			const hasGalleryUploads = variants.some((v) => (v.galleryFiles?.length ?? 0) > 0);

			let res: Response;
			if (hasGalleryUploads) {
				const formData = new FormData();
				formData.append('data', JSON.stringify(payload));
				for (const v of variants) {
					for (const file of v.galleryFiles ?? []) {
						formData.append(`gallery:${v.sku}`, file);
					}
				}
				res = await fetch('/api/admin/products', {
					method: 'POST',
					body: formData
				});
			} else {
				res = await fetch('/api/admin/products', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}

			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `创建商品失败 (${res.status})`);
			await goto('/admin/products');
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '创建失败';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>新建商品 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class={ADMIN_PAGE.container}>
	<!-- Back link & Header -->
	<div class="space-y-3">
		<a
			href="/admin/products"
			class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
		>
			<UiIcon icon={ArrowLeft} size={14} />
			返回商品工作台
		</a>

		<div class={ADMIN_PAGE.header}>
			<div class="flex items-center gap-3">
				{#if firstVariantImage}
					<img
						src={firstVariantImage}
						alt=""
						class="w-10 h-10 object-cover rounded-xl border border-zinc-200 bg-white shrink-0"
					/>
				{/if}
				<div>
					<div class="flex items-center gap-3 flex-wrap">
						<h1 class={ADMIN_PAGE.title}>新建商品</h1>
						{#if isActive}
							<span class={ADMIN_BADGES.success}>创建后立即上线</span>
						{:else}
							<span class={ADMIN_BADGES.neutral}>创建为下架草稿</span>
						{/if}
						{#if isFeatured}
							<span class={ADMIN_BADGES.warning}>首页精选推荐</span>
						{/if}
						{#if variants.length > 0}
							<span class={ADMIN_BADGES.neutral}>总库存: {totalStock} 件</span>
							<span class={ADMIN_BADGES.neutral}>规格: {variants.length} 款</span>
						{/if}
					</div>
					<p class={ADMIN_PAGE.subtitle}>
						录入商品核心资料、绑定分类与多规格图，提交时将自动在 Stripe 开通 Product 与统一计费 Price。
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2.5 flex-wrap">
				{#if title || price || compareAt || description || material || care || detailsText || variants.length > 0}
					<button
						type="button"
						onclick={resetForm}
						disabled={saving}
						class="{ADMIN_BUTTONS.secondary} text-xs font-semibold"
					>
						清空重置
					</button>
				{/if}

				<button
					type="button"
					onclick={submit}
					disabled={saving || !isFormValid}
					class={ADMIN_BUTTONS.primary}
				>
					{#if saving}
						<span
							class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
						></span>
						<span>正在保存...</span>
					{:else}
						<span>创建商品</span>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Error Alert -->
	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<UiIcon icon={CircleAlert} size={16} class="shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Two-Column Product Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
		<!-- Left Main Column (2 cols) -->
		<div class="lg:col-span-2 space-y-6 min-w-0">
			<!-- Section 1: 基本信息 -->
			<section class={ADMIN_CARDS.section}>
				<div class={ADMIN_CARDS.header}>
					<div class={ADMIN_CARDS.sectionHeader}>
						<span class={ADMIN_CARDS.sectionIconWrap}>
							<UiIcon icon={FileText} size={ICONS.sizeXl} />
						</span>
						<div>
							<h2 class={ADMIN_CARDS.title}>基本信息</h2>
							<p class={ADMIN_CARDS.subtitle}>设置商品面向顾客展示的核心标题与文案介绍</p>
						</div>
					</div>
				</div>

				<div class="space-y-5 pt-5">
					<div>
						<div class="flex items-center justify-between mb-1.5">
							<label for="new-title" class={ADMIN_FORMS.label}> 商品标题 * </label>
							<span class={ADMIN_FORMS.counter}>{title.length}/120</span>
						</div>
						<input
							id="new-title"
							bind:value={title}
							maxlength="120"
							placeholder="例如：极简法式重磅亚麻西装"
							class={ADMIN_FORMS.input}
						/>
						<span class={ADMIN_FORMS.help}
							>标题需为 2–120 字符，系统将自动基于标题派生前台 URL Slug</span
						>
					</div>

					<div>
						<label for="new-desc" class={ADMIN_FORMS.label}> 商品详细描述 </label>
						<textarea
							id="new-desc"
							bind:value={description}
							rows="4"
							placeholder="填写版型剪裁、推荐搭配等面向顾客的整体介绍..."
							class={ADMIN_FORMS.textarea}
						></textarea>
						<span class={ADMIN_FORMS.help}>支持详细段落叙述，在店铺详情页中完整展示</span>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="new-material" class={ADMIN_FORMS.label}> 面料材质 </label>
								<span class={ADMIN_FORMS.counter}>{material.length}/300</span>
							</div>
							<input
								id="new-material"
								bind:value={material}
								maxlength="300"
								placeholder="例如：100% 重磅亚麻"
								class={ADMIN_FORMS.input}
							/>
						</div>

						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="new-care" class={ADMIN_FORMS.label}> 护理说明 </label>
								<span class={ADMIN_FORMS.counter}>{care.length}/500</span>
							</div>
							<input
								id="new-care"
								bind:value={care}
								maxlength="500"
								placeholder="例如：冷水机洗，平铺晾干"
								class={ADMIN_FORMS.input}
							/>
						</div>
					</div>

					<div>
						<label for="new-details" class={ADMIN_FORMS.label}>
							细节条目 <span class="normal-case font-normal text-zinc-400">(一行一条，前台逐条展示)</span>
						</label>
						<textarea
							id="new-details"
							bind:value={detailsText}
							rows="3"
							placeholder="法式剪裁&#10;预缩处理&#10;天然贝壳扣"
							class={ADMIN_FORMS.textarea}
						></textarea>
					</div>
				</div>
			</section>
		</div>

		<!-- Right Sidebar Column (1 col) -->
		<div class="space-y-6">
			<!-- Card 1: 所属分类 -->
			<section class={ADMIN_CARDS.section}>
				<div class={ADMIN_CARDS.header}>
					<div class={ADMIN_CARDS.sectionHeader}>
						<span class={ADMIN_CARDS.sectionIconWrap}>
							<UiIcon icon={Tag} size={ICONS.sizeXl} />
						</span>
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between gap-2">
								<h2 class={ADMIN_CARDS.title}>所属分类</h2>
								<span class="text-[11px] font-mono text-zinc-400">已选 {selectedCategories.length} 个</span>
							</div>
							<p class={ADMIN_CARDS.subtitle}>绑定商品所属类目标签，按层级分类多选</p>
						</div>
					</div>
				</div>

				<div class="space-y-3.5 pt-4">
					{#if categoryTierGroups.length > 0}
						{#each categoryTierGroups as group (group.id)}
							<div class="space-y-1.5">
								<div class="flex items-center justify-between">
									<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
										{group.label}
									</span>
									<span class="text-[10px] font-mono text-zinc-400">
										已选 {group.categories.filter((c) => selectedCategories.includes(c.id)).length}
									</span>
								</div>
								<div class="flex flex-wrap gap-2">
									{#each group.categories as cat (cat.id)}
										{@const checked = selectedCategories.includes(cat.id)}
										<button
											type="button"
											onclick={() => toggleCategory(cat.id)}
											class="{checked
												? ADMIN_BUTTONS.pillActive
												: ADMIN_BUTTONS.pillInactive} text-xs cursor-pointer"
										>
											<span>{cat.name || cat.slug}</span>
										</button>
									{/each}
								</div>
							</div>
						{/each}
					{:else}
						<div class="py-4 px-3 rounded-lg border border-dashed border-zinc-200 text-center text-[11px] text-zinc-400">
							暂无可用的商品分类，可在分类管理中添加
						</div>
					{/if}
				</div>
			</section>

			<!-- Card 3: 创建提交快捷卡片 -->
			<section class="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
				<div>
					<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-900">操作</h3>
					<p class="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
						录入完成后点击创建商品，将同步开通 Stripe 计费。
					</p>
				</div>

				<div class="flex items-center gap-2 pt-1">
					{#if title || price || compareAt || description || material || care || detailsText || variants.length > 0}
						<button
							type="button"
							onclick={resetForm}
							disabled={saving}
							class="{ADMIN_BUTTONS.secondarySm} flex-1"
						>
							清空重置
						</button>
					{/if}

					<button
						type="button"
						onclick={submit}
						disabled={saving || !isFormValid}
						class="{ADMIN_BUTTONS.primary} {title || price ? 'flex-1' : 'w-full'}"
					>
						{#if saving}
							<span
								class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
							></span>
							<span>保存中...</span>
						{:else}
							<span>创建商品</span>
						{/if}
					</button>
				</div>
			</section>
		</div>
	</div>

	<!-- Bottom Section: 售价与规格矩阵 (通栏满屏宽) -->
	<section class={ADMIN_CARDS.section}>
		<div class={ADMIN_CARDS.header}>
			<div class={ADMIN_CARDS.sectionHeader}>
				<span class={ADMIN_CARDS.sectionIconWrap}>
					<UiIcon icon={Layers} size={ICONS.sizeXl} />
				</span>
				<div>
					<h2 class={ADMIN_CARDS.title}>售价与规格矩阵</h2>
					<p class={ADMIN_CARDS.subtitle}>
						支持按颜色和尺码独立定价与库存管理，基础价自动同步 Stripe
					</p>
				</div>
			</div>
		</div>

		<div class="pt-5">
			<VariantMatrix bind:variants productSlug={title} />
		</div>
	</section>
</div>
