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
		ICONS
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

	// Image state
	// svelte-ignore state_referenced_locally
	let initialMainImage = data.product.mainImage || '';
	let currentMainImage = $state(initialMainImage);
	let newImageFile = $state<File | null>(null);
	let imagePreviewUrl = $state<string | null>(null);
	let activeDisplayImage = $derived(imagePreviewUrl || currentMainImage);
	let imageCleared = $state(false);
	let fileInputRef: HTMLInputElement | null = null;

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
				gallery: [...(v.gallery ?? [])].sort()
			}))
		)
	};

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
					gallery: [...(v.gallery ?? [])].sort()
				}))
			) !== initialSnapshot.variantsJson ||
			variants.some((v) => (v.galleryFiles?.length ?? 0) > 0) ||
			newImageFile !== null ||
			imageCleared
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

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			newImageFile = file;
			imageCleared = false;
			if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = URL.createObjectURL(file);
		}
	}

	function removeImage() {
		if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
		newImageFile = null;
		imagePreviewUrl = null;
		currentMainImage = '';
		imageCleared = true;
		if (fileInputRef) fileInputRef.value = '';
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
		if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
		newImageFile = null;
		imagePreviewUrl = null;
		currentMainImage = initialMainImage;
		imageCleared = false;
		if (fileInputRef) fileInputRef.value = '';
		error = '';
	}

	async function submit() {
		saving = true;
		error = '';
		rolled = false;
		saveSuccess = false;

		try {
			const payload = {
				title,
				description,
				material,
				care,
				details: detailsText
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line.length > 0),
				price: price === '' ? undefined : Number(price),
				compare_at_price: compareAt === '' ? null : Number(compareAt),
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
					gallery: v.gallery ?? []
				})),
				...(imageCleared ? { main_image_clear: true } : {})
			};
			const hasGalleryUploads = variants.some((v) => (v.galleryFiles?.length ?? 0) > 0);

			let res: Response;
			if (newImageFile || imageCleared || hasGalleryUploads) {
				const formData = new FormData();
				formData.append('data', JSON.stringify(payload));
				if (newImageFile) {
					formData.append('main_image', newImageFile);
				} else if (imageCleared) {
					formData.append('main_image', '');
				}
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
					disabled={saving || (!isDirty && !rolled) || !title.trim() || !price}
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

	<!-- Section 1: Product Information -->
	<section class={ADMIN_CARDS.section}>
		<div class="{ADMIN_CARDS.header} gap-4 flex-wrap">
			<div class={ADMIN_CARDS.sectionHeader}>
				<span class={ADMIN_CARDS.sectionIconWrap}>
					<UiIcon icon={FileText} size={ICONS.sizeXl} />
				</span>
				<div>
					<h2 class={ADMIN_CARDS.title}>商品信息</h2>
					<p class={ADMIN_CARDS.subtitle}>设置商品核心标题、文案介绍、所属类目与前台展示状态</p>
				</div>
			</div>
			<div class="ml-auto flex min-w-0 max-w-full">
				{#if data.categories && data.categories.length > 0}
					<div
						class="flex min-w-0 max-w-full flex-nowrap justify-start gap-1.5 overflow-x-auto px-0.5 py-1 -my-1"
					>
						{#each data.categories as cat (cat.id)}
							{@const checked = selectedCategories.includes(cat.id)}
							<button
								type="button"
								onclick={() => toggleCategory(cat.id)}
								class="{checked
									? ADMIN_BUTTONS.pillActive
									: ADMIN_BUTTONS.pillInactive} shrink-0 whitespace-nowrap"
							>
								<span>{cat.name}</span>
							</button>
						{/each}
					</div>
				{:else}
					<span class="text-[11px] text-zinc-400">暂无可用分类</span>
				{/if}
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

		<div class="pt-6 mt-6 border-t border-zinc-100">
			<!-- Status pills -->
			<div class="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					role="switch"
					aria-checked={isActive}
					aria-label="发布到店铺前台开关"
					onclick={() => (isActive = !isActive)}
					class={isActive ? ADMIN_BUTTONS.pillActive : ADMIN_BUTTONS.pillInactive}
				>
					<span>{isActive ? '在售' : '下架'}</span>
				</button>

				<button
					type="button"
					role="switch"
					aria-checked={isFeatured}
					aria-label="首页精选推荐开关"
					onclick={() => (isFeatured = !isFeatured)}
					class={isFeatured ? ADMIN_BUTTONS.pillActive : ADMIN_BUTTONS.pillInactive}
				>
					<span>{isFeatured ? '精选' : '常规'}</span>
				</button>
			</div>
		</div>
	</section>

	<!-- Section 2: Main Image & Media Assets -->
	<section class={ADMIN_CARDS.section}>
		<div class={ADMIN_CARDS.header}>
			<div class={ADMIN_CARDS.sectionHeader}>
				<span class={ADMIN_CARDS.sectionIconWrap}>
					<UiIcon icon={ImageIcon} size={ICONS.sizeXl} />
				</span>
				<div>
					<h2 class={ADMIN_CARDS.title}>主图与媒体资产</h2>
					<p class={ADMIN_CARDS.subtitle}>管理商品在列表封面与详情主视觉呈现的高清图</p>
				</div>
			</div>
		</div>

		<div class="space-y-5 pt-5">
			<!-- Hidden File Input -->
			<input
				type="file"
				accept="image/jpeg,image/png,image/webp,image/avif"
				class="hidden"
				bind:this={fileInputRef}
				onchange={handleFileSelect}
			/>

			{#if activeDisplayImage}
				<div
					class="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/40 flex flex-col sm:flex-row items-center sm:items-start gap-5"
				>
					<div
						class="w-36 h-36 rounded-xl border border-zinc-200 bg-white overflow-hidden shrink-0 flex items-center justify-center relative group"
					>
						<img
							src={activeDisplayImage}
							alt={title}
							class="w-full h-full object-cover object-center"
						/>
					</div>

					<div class="space-y-3 flex-1 text-center sm:text-left">
						<div class="space-y-1">
							<div class="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
								<span class="text-xs font-bold uppercase tracking-wider text-zinc-900">
									商品主图
								</span>
								{#if newImageFile}
									<span class={ADMIN_BADGES.info}>待保存新图: {newImageFile.name}</span>
								{:else}
									<span class={ADMIN_BADGES.success}>已云端同步</span>
								{/if}
							</div>
							<p class="text-[11px] text-zinc-400">
								尺寸建议 1200×1200 像素以上纯色或干净背景正方形图，支持 JPG、PNG、WebP 与 AVIF。
							</p>
						</div>

						<div class="flex items-center justify-center sm:justify-start gap-2.5 pt-1">
							<button
								type="button"
								onclick={() => fileInputRef?.click()}
								class={ADMIN_BUTTONS.secondary}
							>
								<UiIcon icon={RefreshCw} size={14} />
								替换图片
							</button>

							<button type="button" onclick={removeImage} class={ADMIN_BUTTONS.dangerSecondary}>
								<UiIcon icon={Trash2} size={14} />
								移除主图
							</button>
						</div>
					</div>
				</div>
			{:else}
				<div
					role="button"
					tabindex="0"
					onclick={() => fileInputRef?.click()}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') fileInputRef?.click();
					}}
					class="w-full py-10 px-6 border-2 border-dashed border-zinc-300 hover:border-zinc-900 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 transition-all text-center flex flex-col items-center justify-center cursor-pointer group"
				>
					<div
						class="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 group-hover:border-zinc-400 transition-colors shadow-xs mb-3"
					>
						<UiIcon icon={Upload} size={20} />
					</div>
					<p class="text-xs font-bold uppercase tracking-wider text-zinc-800">
						点击或拖拽上传商品主图
					</p>
					<p class="text-[11px] text-zinc-400 mt-1">
						支持 JPG、PNG、WebP、AVIF 格式，建议比例 1:1 正方形
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Section 3: Pricing & Variant Matrix -->
	<section class={ADMIN_CARDS.section}>
		<div class={ADMIN_CARDS.header}>
			<div class={ADMIN_CARDS.sectionHeader}>
				<span class={ADMIN_CARDS.sectionIconWrap}>
					<UiIcon icon={Layers} size={ICONS.sizeXl} />
				</span>
				<div>
					<h2 class={ADMIN_CARDS.title}>售价与规格矩阵</h2>
					<p class={ADMIN_CARDS.subtitle}>基础售价联动 Stripe 自动计费，多规格管理实时库存与 SKU</p>
				</div>
			</div>
		</div>

		<div class="space-y-6 pt-5">
			<!-- Pricing fields: Clean & Minimalist -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-5 pb-6 border-b border-zinc-100">
				<div>
					<label for="edit-price" class="block text-xs font-bold text-zinc-900 mb-1.5">
						当前售价 <span class="text-rose-500">*</span>
					</label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm font-semibold">$</span>
						<input
							id="edit-price"
							bind:value={price}
							type="number"
							min="0"
							step="0.01"
							placeholder="120.00"
							class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-medium text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors shadow-2xs"
						/>
					</div>
					<p class="text-[11px] text-zinc-400 mt-1">实付结算基准价（联动 Stripe 扣款）</p>
				</div>

				<div>
					<div class="flex items-center justify-between mb-1.5">
						<label for="edit-compare-at" class="block text-xs font-bold text-zinc-900">
							划线建议原价 <span class="text-zinc-400 font-normal text-[11px]">(选填)</span>
						</label>
						{#if compareAt && price && Number(compareAt) > Number(price)}
							<span class="text-[10px] font-mono font-semibold text-emerald-700">
								省 ${(Number(compareAt) - Number(price)).toFixed(2)} (-{Math.round((1 - Number(price) / Number(compareAt)) * 100)}%)
							</span>
						{/if}
					</div>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm font-semibold">$</span>
						<input
							id="edit-compare-at"
							bind:value={compareAt}
							type="number"
							min="0"
							step="0.01"
							placeholder="150.00"
							class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-medium text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors shadow-2xs"
						/>
					</div>
					<p class="text-[11px] text-zinc-400 mt-1">若高于现价，前台展示划线折扣</p>
				</div>

				<div>
					<label for="edit-curr" class="block text-xs font-bold text-zinc-900 mb-1.5">
						结算货币
					</label>
					<select
						id="edit-curr"
						bind:value={currency}
						class="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors shadow-2xs cursor-pointer"
					>
						<option value="USD">USD - 美元 ($)</option>
						<option value="EUR">EUR - 欧元 (€)</option>
						<option value="GBP">GBP - 英镑 (£)</option>
						<option value="CAD">CAD - 加元 ($)</option>
					</select>
					<p class="text-[11px] text-zinc-400 mt-1">Stripe 支付网关计费法定货币</p>
				</div>
			</div>

			<!-- Variant Matrix -->
			<div>
				<VariantMatrix bind:variants productSlug={data.product.slug} />
			</div>
		</div>
	</section>

	<!-- Danger zone -->
	<section class="rounded-xl border border-red-200 bg-red-50/50 p-5">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div class="space-y-1">
				<h2 class="text-xs font-bold uppercase tracking-wider text-red-800">危险操作区</h2>
				<p class="text-[11px] text-red-600/80 leading-relaxed">
					删除将移除商品及其全部规格（含图集），Stripe
					商品同步停用。历史订单快照不受影响，此操作不可撤销。
				</p>
			</div>
			{#if confirmDelete}
				<div class="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onclick={() => (confirmDelete = false)}
						disabled={deleting}
						class="{ADMIN_BUTTONS.secondary} text-xs font-semibold"
					>
						取消
					</button>
					<button
						type="button"
						onclick={removeProduct}
						disabled={deleting}
						class="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50"
					>
						{deleting ? '删除中...' : '确认删除'}
					</button>
				</div>
			{:else}
				<button
					type="button"
					onclick={removeProduct}
					class="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-bold uppercase tracking-wider hover:bg-red-100 shrink-0"
				>
					<UiIcon icon={Trash2} size={14} class="inline mr-1.5 -mt-0.5" />
					删除此商品
				</button>
			{/if}
		</div>
	</section>
</div>
