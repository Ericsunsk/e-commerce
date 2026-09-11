<script lang="ts">
	import {
		ArrowLeft,
		CircleAlert,
		FileText,
		Tag,
		Image as ImageIcon,
		Layers,
		Upload,
		Trash2,
		RefreshCw
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { goto } from '$app/navigation';
	import {
		ADMIN_PAGE,
		ADMIN_CARDS,
		ADMIN_BADGES,
		ADMIN_FORMS,
		ADMIN_BUTTONS
	} from '$shared/kernel';
	import type { PageData } from './$types';
	import VariantMatrix, { type VariantRow } from '../_VariantMatrix.svelte';

	let { data }: { data: PageData } = $props();

	let title = $state('');
	let description = $state('');
	let price = $state('');
	let currency = $state('USD');
	let isActive = $state(true);
	let isFeatured = $state(false);
	let selectedCategories = $state<string[]>([]);
	let variants = $state<VariantRow[]>([]);

	// Main image state
	let newImageFile = $state<File | null>(null);
	let imagePreviewUrl = $state<string | null>(null);
	let fileInputRef: HTMLInputElement | null = null;

	let saving = $state(false);
	let error = $state('');

	let isFormValid = $derived(title.trim().length >= 2 && Number(price) > 0);

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
			if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = URL.createObjectURL(file);
		}
	}

	function removeImage() {
		if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
		newImageFile = null;
		imagePreviewUrl = null;
		if (fileInputRef) fileInputRef.value = '';
	}

	function resetForm() {
		title = '';
		description = '';
		price = '';
		currency = 'USD';
		isActive = true;
		isFeatured = false;
		selectedCategories = [];
		variants = [];
		if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
		newImageFile = null;
		imagePreviewUrl = null;
		if (fileInputRef) fileInputRef.value = '';
		error = '';
	}

	async function submit() {
		saving = true;
		error = '';

		try {
			const payload = {
				title,
				description,
				price: Number(price),
				currency,
				is_active: isActive,
				is_featured: isFeatured,
				category: selectedCategories,
				variants: variants.map((v) => ({ ...v, stockQuantity: Number(v.stockQuantity) }))
			};

			let res: Response;
			if (newImageFile) {
				const formData = new FormData();
				formData.append('data', JSON.stringify(payload));
				formData.append('main_image', newImageFile);
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
			<div>
				<div class="flex items-center gap-3 flex-wrap">
					<h1 class={ADMIN_PAGE.title}>
						新建商品
					</h1>
					{#if isActive}
						<span class={ADMIN_BADGES.success}>创建后立即上线</span>
					{:else}
						<span class={ADMIN_BADGES.neutral}>创建为下架草稿</span>
					{/if}
					{#if isFeatured}
						<span class={ADMIN_BADGES.warning}>首页精选推荐</span>
					{/if}
				</div>
				<p class={ADMIN_PAGE.subtitle}>
					录入商品核心资料、绑定分类与主图，提交时将自动在 Stripe 开通 Product 与统一计费 Price。
				</p>
			</div>

			<div class="flex items-center gap-2.5 flex-wrap">
				{#if title || price || description || variants.length > 0}
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

	<!-- Section 1: Basic Information -->
	<section class={ADMIN_CARDS.section}>
		<div class={ADMIN_CARDS.header}>
			<div class="flex items-center gap-3">
				<div class={ADMIN_CARDS.iconBox}>
					<UiIcon icon={FileText} size={16} />
				</div>
				<div>
					<h2 class={ADMIN_CARDS.title}>基本信息</h2>
					<p class={ADMIN_CARDS.subtitle}>设置商品面向顾客展示的核心标题与文案介绍</p>
				</div>
			</div>
		</div>

		<div class="space-y-5 pt-5">
			<div>
				<div class="flex items-center justify-between mb-1.5">
					<label for="new-title" class={ADMIN_FORMS.label}>
						商品标题 *
					</label>
					<span class={ADMIN_FORMS.counter}>{title.length}/120</span>
				</div>
				<input
					id="new-title"
					bind:value={title}
					maxlength="120"
					placeholder="例如：极简法式重磅亚麻西装"
					class={ADMIN_FORMS.input}
				/>
				<span class={ADMIN_FORMS.help}>标题需为 2–120 字符，系统将自动基于标题派生前台 URL Slug</span>
			</div>

			<div>
				<label for="new-desc" class={ADMIN_FORMS.label}>
					商品详细描述
				</label>
				<textarea
					id="new-desc"
					bind:value={description}
					rows="4"
					placeholder="填写面料材质、版型剪裁、洗涤保养提示与推荐搭配..."
					class={ADMIN_FORMS.textarea}
				></textarea>
				<span class={ADMIN_FORMS.help}>支持详细段落叙述，在店铺详情页中完整展示</span>
			</div>
		</div>
	</section>

	<!-- Section 2: Categories & Display Status -->
	<section class={ADMIN_CARDS.section}>
		<div class={ADMIN_CARDS.header}>
			<div class="flex items-center gap-3">
				<div class={ADMIN_CARDS.iconBox}>
					<UiIcon icon={Tag} size={16} />
				</div>
				<div>
					<h2 class={ADMIN_CARDS.title}>分类与展示状态</h2>
					<p class={ADMIN_CARDS.subtitle}>配置商品前台类目归属、销售状态与首页精选曝光</p>
				</div>
			</div>
		</div>

		<div class="space-y-6 pt-5">
			<!-- Switches -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- is_active toggle -->
				<div
					class="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 flex items-start justify-between gap-4"
				>
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<span class="text-xs font-bold uppercase tracking-wider text-zinc-800">
								发布到店铺前台
							</span>
							{#if isActive}
								<span class={ADMIN_BADGES.success}>在线可售</span>
							{:else}
								<span class={ADMIN_BADGES.neutral}>已下架</span>
							{/if}
						</div>
						<p class="text-[11px] text-zinc-500 leading-relaxed">
							开启后该商品在前台类目页及搜索结果中可被顾客查看与选购；关闭则仅管理员后台可见。
						</p>
					</div>

					<button
						type="button"
						role="switch"
						aria-checked={isActive}
						aria-label="发布到店铺前台开关"
						onclick={() => (isActive = !isActive)}
						class="{ADMIN_FORMS.switchBase} {isActive
							? ADMIN_FORMS.switchTrackActive
							: ADMIN_FORMS.switchTrackInactive} shrink-0 cursor-pointer"
					>
						<span
							class="{ADMIN_FORMS.switchThumb} {isActive
								? 'translate-x-5'
								: 'translate-x-1'}"
						></span>
					</button>
				</div>

				<!-- is_featured toggle -->
				<div
					class="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 flex items-start justify-between gap-4"
				>
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<span class="text-xs font-bold uppercase tracking-wider text-zinc-800">
								首页精选推荐 (Featured)
							</span>
							{#if isFeatured}
								<span class={ADMIN_BADGES.warning}>精选推荐</span>
							{:else}
								<span class={ADMIN_BADGES.neutral}>标准陈列</span>
							{/if}
						</div>
						<p class="text-[11px] text-zinc-500 leading-relaxed">
							开启后将在前台首页精选产品板块优先置顶展示，重点引导顾客浏览下单。
						</p>
					</div>

					<button
						type="button"
						role="switch"
						aria-checked={isFeatured}
						aria-label="首页精选推荐开关"
						onclick={() => (isFeatured = !isFeatured)}
						class="{ADMIN_FORMS.switchBase} {isFeatured
							? 'bg-amber-500'
							: ADMIN_FORMS.switchTrackInactive} shrink-0 cursor-pointer"
					>
						<span
							class="{ADMIN_FORMS.switchThumb} {isFeatured
								? 'translate-x-5'
								: 'translate-x-1'}"
						></span>
					</button>
				</div>
			</div>

			<!-- Category Multi-Select -->
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class={ADMIN_FORMS.label}>所属分类关联</span>
					<span class="text-[11px] text-zinc-500">
						已选择 <strong class="font-mono text-zinc-900">{selectedCategories.length}</strong> 个分类
					</span>
				</div>

				{#if data.categories && data.categories.length > 0}
					<div class="flex flex-wrap gap-2 pt-1">
						{#each data.categories as cat (cat.id)}
							{@const checked = selectedCategories.includes(cat.id)}
							<button
								type="button"
								onclick={() => toggleCategory(cat.id)}
								class={checked ? ADMIN_BUTTONS.pillActive : ADMIN_BUTTONS.pillInactive}
							>
								<span>{cat.name}</span>
							</button>
						{/each}
					</div>
				{:else}
					<div
						class="py-4 px-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center space-y-1"
					>
						<p class="text-xs text-zinc-500">暂无可用的商品分类</p>
						<p class="text-[11px] text-zinc-400">可在分类管理中补充类目后再进行选择绑定。</p>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Section 3: Main Image & Media Assets -->
	<section class={ADMIN_CARDS.section}>
		<div class={ADMIN_CARDS.header}>
			<div class="flex items-center gap-3">
				<div class={ADMIN_CARDS.iconBox}>
					<UiIcon icon={ImageIcon} size={16} />
				</div>
				<div>
					<h2 class={ADMIN_CARDS.title}>主图与媒体资产</h2>
					<p class={ADMIN_CARDS.subtitle}>上传商品首屏主视觉与列表缩略图</p>
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

			{#if imagePreviewUrl}
				<div
					class="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/40 flex flex-col sm:flex-row items-center sm:items-start gap-5"
				>
					<div
						class="w-36 h-36 rounded-xl border border-zinc-200 bg-white overflow-hidden shrink-0 shadow-xs flex items-center justify-center relative group"
					>
						<img
							src={imagePreviewUrl}
							alt="主图预览"
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
									<span class={ADMIN_BADGES.info}>已选取: {newImageFile.name}</span>
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

							<button
								type="button"
								onclick={removeImage}
								class={ADMIN_BUTTONS.dangerSecondary}
							>
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

			<!-- Multi-gallery shortcut guidance -->
			<div class="p-3.5 rounded-xl border border-zinc-200 bg-white/60 flex items-start gap-3">
				<div class="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 shrink-0 mt-0.5">
					<UiIcon icon={ImageIcon} size={14} />
				</div>
				<div class="space-y-0.5 text-xs">
					<span class="font-bold text-zinc-800">关于规格颜色图集 (Gallery Images)</span>
					<p class="text-[11px] text-zinc-500 leading-relaxed">
						商品创建成功后，每个变体规格均可在 PocketBase <code class="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">product_variants</code> 集合中独立追加最多 10 张专属颜色图集，前台切换颜色时将同步展示。
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 4: Pricing & Variant Matrix -->
	<section class={ADMIN_CARDS.section}>
		<div class={ADMIN_CARDS.header}>
			<div class="flex items-center gap-3">
				<div class={ADMIN_CARDS.iconBox}>
					<UiIcon icon={Layers} size={16} />
				</div>
				<div>
					<h2 class={ADMIN_CARDS.title}>售价与规格矩阵</h2>
					<p class={ADMIN_CARDS.subtitle}>统一基础零售价联动 Stripe 自动计费，录入多规格与库存初始值</p>
				</div>
			</div>
		</div>

		<div class="space-y-6 pt-5">
			<!-- Pricing fields -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label for="new-price" class={ADMIN_FORMS.label}>
						基础统一售价 *
					</label>
					<div class="relative">
						<span
							class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold"
						>
							$
						</span>
						<input
							id="new-price"
							bind:value={price}
							type="number"
							min="0"
							step="0.01"
							placeholder="120.00"
							class="{ADMIN_FORMS.input} pl-8 font-mono"
						/>
					</div>
					<span class={ADMIN_FORMS.help}>输入标准正数金额</span>
				</div>

				<div>
					<label for="new-curr" class={ADMIN_FORMS.label}>
						结算币种
					</label>
					<select id="new-curr" bind:value={currency} class={ADMIN_FORMS.select}>
						<option value="USD">USD - 美元 ($)</option>
						<option value="EUR">EUR - 欧元 (€)</option>
						<option value="GBP">GBP - 英镑 (£)</option>
						<option value="CAD">CAD - 加元 ($)</option>
					</select>
					<span class={ADMIN_FORMS.help}>Stripe 结账计费标准币种</span>
				</div>
			</div>

			<!-- Variant Matrix -->
			<div>
				<VariantMatrix bind:variants productSlug={title} />
			</div>

			<!-- Bottom Actions in normal flow -->
			<div class="pt-5 border-t border-zinc-100 flex items-center justify-between gap-3">
				{#if title || price || description || variants.length > 0}
					<button
						type="button"
						onclick={resetForm}
						disabled={saving}
						class="{ADMIN_BUTTONS.secondary} text-xs font-semibold"
					>
						清空重置
					</button>
				{:else}
					<div></div>
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
	</section>
</div>
