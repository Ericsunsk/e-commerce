<script lang="ts">
	import {
		ArrowLeft,
		CircleAlert,
		CircleCheck,
		FileText,
		Image as ImageIcon,
		Layers,
		ExternalLink,
		Upload,
		Trash2,
		RefreshCw
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { beforeNavigate, goto } from '$app/navigation';
	import {
		ADMIN_PAGE,
		ADMIN_CARDS,
		ADMIN_BADGES,
		ADMIN_FORMS,
		ADMIN_BUTTONS,
		ICONS,
		getFileUrl
	} from '$shared/kernel';
	import type { PageData } from './$types';
	import VariantMatrix, { type VariantRow } from '../_VariantMatrix.svelte';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let title = $state(data.product.title);
	// svelte-ignore state_referenced_locally
	let description = $state(data.product.description);
	// svelte-ignore state_referenced_locally
	let material = $state(data.product.material);
	// svelte-ignore state_referenced_locally
	let care = $state(data.product.care);
	// svelte-ignore state_referenced_locally
	let detailsText = $state(data.product.details.join('\n'));
	// svelte-ignore state_referenced_locally
	let price = $state(String(data.product.priceDollars || ''));
	// svelte-ignore state_referenced_locally
	let compareAt = $state(
		data.product.compareAtDollars !== null && data.product.compareAtDollars !== undefined
			? String(data.product.compareAtDollars)
			: ''
	);
	// svelte-ignore state_referenced_locally
	let currency = $state(data.product.currency.toUpperCase());
	// svelte-ignore state_referenced_locally
	let isActive = $state(data.product.isActive);
	// svelte-ignore state_referenced_locally
	let isFeatured = $state(data.product.isFeatured);
	// svelte-ignore state_referenced_locally
	let selectedCategories = $state<string[]>([...data.product.categoryIds]);
	// svelte-ignore state_referenced_locally
	let variants = $state<VariantRow[]>(data.product.variants.map((v) => ({ ...v })));

	// First SKU / Variant Image (drives product cover image)
	let firstVariantImage = $derived.by(() => {
		for (const v of variants) {
			if (v.galleryFiles && v.galleryFiles.length > 0) {
				return URL.createObjectURL(v.galleryFiles[0]);
			}
			if (v.gallery && v.gallery.length > 0 && v.id) {
				return getFileUrl('product_variants', v.id, v.gallery[0], { thumb: '200x200' });
			}
		}
		return data.product.mainImage || '';
	});

	let saving = $state(false);
	let error = $state('');
	let rolled = $state(false);
	let saveSuccess = $state(false);
	let confirmDelete = $state(false);
	let deleting = $state(false);
	let allowLeave = $state(false);

	let totalStock = $derived(variants.reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0));

	// Dirty detection
	// svelte-ignore state_referenced_locally
	const initialSnapshot = {
		title: data.product.title,
		description: data.product.description,
		material: data.product.material,
		care: data.product.care,
		detailsText: data.product.details.join('\n'),
		price: String(data.product.priceDollars || ''),
		compareAt:
			data.product.compareAtDollars !== null && data.product.compareAtDollars !== undefined
				? String(data.product.compareAtDollars)
				: '',
		currency: data.product.currency.toUpperCase(),
		isActive: data.product.isActive,
		isFeatured: data.product.isFeatured,
		categoryIds: [...data.product.categoryIds].sort().join(','),
		variantsJson: JSON.stringify(
			data.product.variants.map((v) => ({
				color: v.color,
				size: v.size,
				sku: v.sku,
				stockQuantity: Number(v.stockQuantity),
				price: v.price,
				compareAt: v.compareAt,
				gallery: [...(v.gallery ?? [])].sort()
			}))
		)
	};

	let effectivePrice = $derived(
		price !== ''
			? Number(price)
			: (variants.find((v) => v.price !== undefined && Number(v.price) > 0)?.price ?? 0)
	);

	let isDirty = $derived(
		title !== initialSnapshot.title ||
			description !== initialSnapshot.description ||
			material !== initialSnapshot.material ||
			care !== initialSnapshot.care ||
			detailsText !== initialSnapshot.detailsText ||
			price !== initialSnapshot.price ||
			compareAt !== initialSnapshot.compareAt ||
			currency !== initialSnapshot.currency ||
			isActive !== initialSnapshot.isActive ||
			isFeatured !== initialSnapshot.isFeatured ||
			[...selectedCategories].sort().join(',') !== initialSnapshot.categoryIds ||
			JSON.stringify(
				variants.map((v) => ({
					color: v.color,
					size: v.size,
					sku: v.sku,
					stockQuantity: Number(v.stockQuantity),
					price: v.price,
					compareAt: v.compareAt,
					gallery: [...(v.gallery ?? [])].sort()
				}))
			) !== initialSnapshot.variantsJson ||
			variants.some((v) => (v.galleryFiles?.length ?? 0) > 0)
	);

	beforeNavigate((nav) => {
		if (!isDirty || allowLeave) return;
		if (!confirm('有未保存的修改，确定要离开吗？')) nav.cancel();
	});

	function toggleCategory(catId: string) {
		if (selectedCategories.includes(catId)) {
			selectedCategories = selectedCategories.filter((id) => id !== catId);
		} else {
			selectedCategories = [...selectedCategories, catId];
		}
	}

	function resetForm() {
		title = initialSnapshot.title;
		description = initialSnapshot.description;
		material = initialSnapshot.material;
		care = initialSnapshot.care;
		detailsText = initialSnapshot.detailsText;
		price = initialSnapshot.price;
		compareAt = initialSnapshot.compareAt;
		currency = initialSnapshot.currency;
		isActive = initialSnapshot.isActive;
		isFeatured = initialSnapshot.isFeatured;
		selectedCategories = [...data.product.categoryIds];
		variants = data.product.variants.map((v) => ({ ...v }));
		error = '';
	}

	async function submit() {
		saving = true;
		error = '';
		rolled = false;
		saveSuccess = false;

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
					.map((line) => line.trim())
					.filter((line) => line.length > 0),
				price: price !== '' ? Number(price) : fallbackVariantPrice,
				compare_at_price: compareAt !== '' ? Number(compareAt) : (fallbackVariantCompareAt ?? null),
				currency,
				is_active: isActive,
				is_featured: isFeatured,
				category: selectedCategories,
				variants: variants.map((v) => ({
					id: v.id,
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
				res = await fetch(`/api/admin/products/${data.product.id}`, {
					method: 'PATCH',
					body: formData
				});
			} else {
				res = await fetch(`/api/admin/products/${data.product.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}

			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `保存失败 (${res.status})`);

			if (body.product?.priceRolled) {
				rolled = true;
			} else {
				saveSuccess = true;
				allowLeave = true;
				setTimeout(() => {
					goto('/admin/products');
				}, 600);
			}
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '保存失败';
		} finally {
			saving = false;
		}
	}

	async function removeProduct() {
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}
		deleting = true;
		error = '';
		try {
			const res = await fetch(`/api/admin/products/${data.product.id}`, {
				method: 'DELETE'
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `删除失败 (${res.status})`);
			allowLeave = true;
			await goto('/admin/products');
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '删除失败';
			confirmDelete = false;
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>编辑 {title || data.product.title} | 管理后台</title>
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
						<h1 class={ADMIN_PAGE.title}>编辑商品</h1>
						{#if isFeatured}
							<span class={ADMIN_BADGES.warning}>首页精选推荐</span>
						{/if}
						<span class={ADMIN_BADGES.neutral}>总库存: {totalStock} 件</span>
						<span class={ADMIN_BADGES.neutral}>规格: {variants.length} 款</span>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-2.5 flex-wrap">
				{#if isActive}
					<a
						href="/shop/{data.product.slug}"
						target="_blank"
						rel="noreferrer"
						class={ADMIN_BUTTONS.secondary}
					>
						<UiIcon icon={ExternalLink} size={14} />
						预览店铺前台
					</a>
				{/if}

				{#if isDirty}
					<button
						type="button"
						onclick={resetForm}
						disabled={saving}
						class="{ADMIN_BUTTONS.secondary} text-xs font-semibold"
					>
						放弃重置
					</button>
				{/if}

				<button
					type="button"
					onclick={submit}
					disabled={saving || (!isDirty && !rolled) || !title.trim() || effectivePrice <= 0}
					class={ADMIN_BUTTONS.primary}
				>
					{#if saving}
						<span
							class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
						></span>
						<span>保存中...</span>
					{:else}
						<span>保存修改</span>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Status Banners -->
	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<UiIcon icon={CircleAlert} size={16} class="shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	{#if rolled}
		<div
			role="status"
			class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<UiIcon icon={CircleCheck} size={16} class="shrink-0" />
			<span>保存成功——基础价格变动已同步至 Stripe，原旧价格自动归档，历史订单凭证保持不变。</span>
		</div>
	{/if}

	{#if saveSuccess}
		<div
			role="status"
			class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<UiIcon icon={CircleCheck} size={16} class="shrink-0" />
			<span>商品信息已成功更新，正在跳转返回工作台...</span>
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
							<p class={ADMIN_CARDS.subtitle}>设置面向顾客展示的核心标题、图文描述与规格属性</p>
						</div>
					</div>
				</div>

				<div class="space-y-5 pt-5">
					<div>
						<div class="flex items-center justify-between mb-1.5">
							<label for="edit-title" class={ADMIN_FORMS.label}> 商品标题 * </label>
							<span class={ADMIN_FORMS.counter}>{title.length}/120</span>
						</div>
						<input
							id="edit-title"
							bind:value={title}
							maxlength="120"
							placeholder="例如：极简重磅亚麻西装"
							class={ADMIN_FORMS.input}
						/>
					</div>

					<div>
						<label for="edit-desc" class={ADMIN_FORMS.label}> 商品详细描述 </label>
						<textarea
							id="edit-desc"
							bind:value={description}
							rows="4"
							placeholder="填写剪裁版型、搭配建议等面向顾客的整体介绍..."
							class={ADMIN_FORMS.textarea}
						></textarea>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="edit-material" class={ADMIN_FORMS.label}> 面料材质 </label>
								<span class={ADMIN_FORMS.counter}>{material.length}/300</span>
							</div>
							<input
								id="edit-material"
								bind:value={material}
								maxlength="300"
								placeholder="例如：100% 重磅亚麻"
								class={ADMIN_FORMS.input}
							/>
						</div>

						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="edit-care" class={ADMIN_FORMS.label}> 护理说明 </label>
								<span class={ADMIN_FORMS.counter}>{care.length}/500</span>
							</div>
							<input
								id="edit-care"
								bind:value={care}
								maxlength="500"
								placeholder="例如：冷水机洗，平铺晾干"
								class={ADMIN_FORMS.input}
							/>
						</div>
					</div>

					<div>
						<label for="edit-details" class={ADMIN_FORMS.label}>
							细节条目 <span class="normal-case font-normal text-zinc-400">(一行一条，前台逐条展示)</span>
						</label>
						<textarea
							id="edit-details"
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
			<!-- Card 1: 状态与曝光 -->
			<section class={ADMIN_CARDS.section}>
				<div class={ADMIN_CARDS.header}>
					<div class={ADMIN_CARDS.sectionHeader}>
						<div>
							<h2 class={ADMIN_CARDS.title}>发布状态与曝光</h2>
							<p class={ADMIN_CARDS.subtitle}>控制商品前台可售状态与首页推荐</p>
						</div>
					</div>
				</div>

				<div class="space-y-4 pt-4">
					<!-- 在售/下架 Toggle -->
					<div class="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50/50">
						<div class="space-y-0.5">
							<div class="flex items-center gap-2">
								<span class="text-xs font-semibold text-zinc-800">店铺前台销售</span>
								{#if isActive}
									<span class={ADMIN_BADGES.success}>在售</span>
								{:else}
									<span class={ADMIN_BADGES.neutral}>已下架</span>
								{/if}
							</div>
							<p class="text-[11px] text-zinc-400">开启后顾客可浏览并加购结算</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={isActive}
							aria-label="发布到店铺前台开关"
							onclick={() => (isActive = !isActive)}
							class="{ADMIN_FORMS.switchBase} {isActive ? ADMIN_FORMS.switchTrackActive : ADMIN_FORMS.switchTrackInactive} shrink-0 cursor-pointer"
						>
							<span class="{ADMIN_FORMS.switchThumb} {isActive ? 'translate-x-5' : 'translate-x-1'}"></span>
						</button>
					</div>

					<!-- 首页精选 Toggle -->
					<div class="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50/50">
						<div class="space-y-0.5">
							<div class="flex items-center gap-2">
								<span class="text-xs font-semibold text-zinc-800">首页精选推荐</span>
								{#if isFeatured}
									<span class={ADMIN_BADGES.warning}>精选</span>
								{:else}
									<span class={ADMIN_BADGES.neutral}>常规</span>
								{/if}
							</div>
							<p class="text-[11px] text-zinc-400">优先展现在店铺首页精选专区</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={isFeatured}
							aria-label="首页精选推荐开关"
							onclick={() => (isFeatured = !isFeatured)}
							class="{ADMIN_FORMS.switchBase} {isFeatured ? 'bg-amber-500' : ADMIN_FORMS.switchTrackInactive} shrink-0 cursor-pointer"
						>
							<span class="{ADMIN_FORMS.switchThumb} {isFeatured ? 'translate-x-5' : 'translate-x-1'}"></span>
						</button>
					</div>

					{#if isActive}
						<a
							href="/shop/{data.product.slug}"
							target="_blank"
							rel="noreferrer"
							class="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 hover:text-zinc-900 transition-colors"
						>
							<UiIcon icon={ExternalLink} size={13} />
							<span>在独立站前台查看此商品</span>
						</a>
					{/if}
				</div>
			</section>

			<!-- Card 2: 商品分类 -->
			<section class={ADMIN_CARDS.section}>
				<div class={ADMIN_CARDS.header}>
					<div class={ADMIN_CARDS.sectionHeader}>
						<div>
							<div class="flex items-center justify-between gap-2">
								<h2 class={ADMIN_CARDS.title}>所属分类</h2>
								<span class="text-[11px] font-mono text-zinc-400">已选 {selectedCategories.length} 个</span>
							</div>
							<p class={ADMIN_CARDS.subtitle}>绑定商品所属类目标签，支持多选</p>
						</div>
					</div>
				</div>

				<div class="pt-4">
					{#if data.categories && data.categories.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each data.categories as cat (cat.id)}
								{@const checked = selectedCategories.includes(cat.id)}
								<button
									type="button"
									onclick={() => toggleCategory(cat.id)}
									class="{checked
										? ADMIN_BUTTONS.pillActive
										: ADMIN_BUTTONS.pillInactive} text-xs cursor-pointer"
								>
									<span>{cat.name}</span>
								</button>
							{/each}
						</div>
					{:else}
						<div class="py-4 px-3 rounded-lg border border-dashed border-zinc-200 text-center text-[11px] text-zinc-400">
							暂无可用的商品分类，可在分类管理中添加
						</div>
					{/if}
				</div>
			</section>

			<!-- Card 3: 规格与库存速览 -->
			<section class={ADMIN_CARDS.section}>
				<div class={ADMIN_CARDS.header}>
					<div class={ADMIN_CARDS.sectionHeader}>
						<div>
							<h2 class={ADMIN_CARDS.title}>规格与库存速览</h2>
							<p class={ADMIN_CARDS.subtitle}>实时统计当前多规格配置数据</p>
						</div>
					</div>
				</div>

				<div class="space-y-3 pt-4">
					{#if firstVariantImage}
						<div class="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50">
							<img
								src={firstVariantImage}
								alt="商品封面"
								class="w-12 h-12 rounded-lg object-cover border border-zinc-200 bg-white shrink-0"
							/>
							<div class="min-w-0 flex-1">
								<span class="text-xs font-semibold text-zinc-900 block truncate">商品封面主图</span>
								<span class="text-[11px] text-zinc-500 block">自动取自矩阵首款规格图</span>
							</div>
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-3">
						<div class="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50">
							<span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">总在库库存</span>
							<span class="text-lg font-mono font-bold text-zinc-900">{totalStock}</span>
							<span class="text-[10px] text-zinc-400 ml-1 font-mono">件</span>
						</div>

						<div class="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50">
							<span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">细分规格款数</span>
							<span class="text-lg font-mono font-bold text-zinc-900">{variants.length}</span>
							<span class="text-[10px] text-zinc-400 ml-1 font-mono">款</span>
						</div>
					</div>
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
					<p class={ADMIN_CARDS.subtitle}>支持按颜色和尺码独立定价与库存管理，基础价自动同步 Stripe</p>
				</div>
			</div>
		</div>

		<div class="pt-5">
			<VariantMatrix bind:variants productSlug={data.product.slug} />
		</div>
	</section>

	<!-- Danger zone (通栏底部警示) -->
	<section class="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
		<div>
			<h3 class="text-xs font-bold uppercase tracking-wider text-rose-800">危险操作区</h3>
			<p class="text-[11px] text-rose-600/80 leading-relaxed mt-0.5">
				删除将移除商品及其全部规格，Stripe 商品同步停用，不可撤销。
			</p>
		</div>

		{#if confirmDelete}
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (confirmDelete = false)}
					disabled={deleting}
					class="{ADMIN_BUTTONS.secondarySm} flex-1"
				>
					取消
				</button>
				<button
					type="button"
					onclick={removeProduct}
					disabled={deleting}
					class="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
				>
					{deleting ? '删除中...' : '确认删除'}
				</button>
			</div>
		{:else}
			<button
				type="button"
				onclick={removeProduct}
				class="w-full py-1.5 px-3 rounded-lg border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
			>
				<UiIcon icon={Trash2} size={13} />
				<span>删除此商品</span>
			</button>
		{/if}
	</section>
</div>
