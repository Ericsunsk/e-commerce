<script lang="ts">
	import {
		Layers,
		FileText,
		Compass,
		ExternalLink,
		SlidersHorizontal,
		Store,
		DollarSign,
		ShieldAlert,
		Check,
		ArrowRight,
		Globe,
		ImageIcon
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let initialValues = $state<Record<string, string | number | boolean>>({ ...data.settings.values });
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, string | number | boolean>>({ ...data.settings.values });
	let saving = $state(false);
	let error = $state('');
	let saved = $state(false);

	let isDirty = $derived(
		JSON.stringify(values) !== JSON.stringify(initialValues)
	);

	const CURRENCY_PRESETS = [
		{ code: 'USD', symbol: '$', label: '美元 (USD)' },
		{ code: 'EUR', symbol: '€', label: '欧元 (EUR)' },
		{ code: 'GBP', symbol: '£', label: '英镑 (GBP)' },
		{ code: 'CNY', symbol: '¥', label: '人民币 (CNY)' }
	];

	function applyCurrencyPreset(code: string, symbol: string) {
		values.currency_code = code;
		values.currency_symbol = symbol;
	}

	async function save() {
		saving = true;
		error = '';
		saved = false;
		try {
			const payload: Record<string, unknown> = {};
			for (const field of data.fields) {
				const value = values[field.key];
				if (value === undefined || value === '') continue;
				payload[field.key] = field.type === 'number' ? Number(value) : value;
			}
			const res = await fetch('/api/admin/content/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			values = { ...body.settings.values };
			initialValues = { ...values };
			saved = true;
			setTimeout(() => (saved = false), 3000);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '保存失败';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>内容管理中心 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-8 max-w-6xl pb-24">
	<!-- Top Navigation & External Action Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<nav class="flex flex-wrap gap-2" aria-label="内容管理">
			{#each [
				{ href: '/admin/content', label: '站点配置', count: null },
				{ href: '/admin/content/sections', label: '页面排版', count: data.counts.sections },
				{ href: '/admin/content/pages', label: '页面管理', count: data.counts.pages },
				{ href: '/admin/content/navigation', label: '导航管理', count: data.counts.nav }
			] as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.href === '/admin/content' ? 'page' : undefined}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-colors {tab.href ===
					'/admin/content'
						? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
						: 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 bg-white'}"
				>
					<span>{tab.label}</span>
					{#if tab.count !== null}
						<span
							class="px-1.5 py-0.5 rounded-full text-[10px] font-mono {tab.href ===
							'/admin/content'
								? 'bg-white/20 text-white'
								: 'bg-zinc-100 text-zinc-500'}"
						>
							{tab.count}
						</span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2.5 shrink-0">
			<a
				href="/"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-xs transition-colors"
				title="在新窗口查看前台商城实际渲染效果"
			>
				<UiIcon icon={Globe} size={14} />
				<span>浏览前台</span>
			</a>

			{#if data.pocketbaseUrl}
				<a
					href={`${data.pocketbaseUrl}/_/`}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-xs transition-colors"
					title="在新窗口打开 PocketBase 官方数据管理后台"
				>
					<UiIcon icon={ExternalLink} size={14} />
					<span>PB 数据后台</span>
				</a>
			{/if}
		</div>
	</div>

	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
			内容管理中心
		</h1>
		<p class="text-xs text-zinc-500 mt-1">
			统筹管理全站视觉布局、内容单页、导航菜单与核心品牌配置
		</p>
	</div>

	<!-- Module Quick-Launch Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
		<!-- Card 1: 页面排版 -->
		<a
			href="/admin/content/sections"
			class="group bg-white border border-zinc-200 rounded-card p-5 shadow-xs hover:border-zinc-900 hover:shadow-md transition-all flex flex-col justify-between"
		>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
						<UiIcon icon={Layers} size={20} />
					</div>
					<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 font-mono">
						{data.counts.sections} 个区块运行中
					</span>
				</div>
				<div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-zinc-900 group-hover:text-black">
						页面区块排版
					</h3>
					<p class="text-xs text-zinc-500 mt-1.5 leading-relaxed">
						可视化配置首页、关于我们、系列大片等页面的视觉海报、双拼大片与商品橱窗。
					</p>
				</div>
			</div>
			<div class="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-zinc-800 group-hover:text-purple-700 transition-colors">
				<span>管理页面排版</span>
				<UiIcon icon={ArrowRight} size={14} className="transition-transform group-hover:translate-x-1" />
			</div>
		</a>

		<!-- Card 2: 页面管理 -->
		<a
			href="/admin/content/pages"
			class="group bg-white border border-zinc-200 rounded-card p-5 shadow-xs hover:border-zinc-900 hover:shadow-md transition-all flex flex-col justify-between"
		>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
						<UiIcon icon={FileText} size={20} />
					</div>
					<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60 font-mono">
						{data.counts.pages} 个已发布单页
					</span>
				</div>
				<div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-zinc-900 group-hover:text-black">
						单页与法律条款
					</h3>
					<p class="text-xs text-zinc-500 mt-1.5 leading-relaxed">
						管理独立单页路由、品牌故事正文、退换货政策与隐私服务条款等静态富文本。
					</p>
				</div>
			</div>
			<div class="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-zinc-800 group-hover:text-sky-700 transition-colors">
				<span>管理内容单页</span>
				<UiIcon icon={ArrowRight} size={14} className="transition-transform group-hover:translate-x-1" />
			</div>
		</a>

		<!-- Card 3: 导航管理 -->
		<a
			href="/admin/content/navigation"
			class="group bg-white border border-zinc-200 rounded-card p-5 shadow-xs hover:border-zinc-900 hover:shadow-md transition-all flex flex-col justify-between"
		>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
						<UiIcon icon={Compass} size={20} />
					</div>
					<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono">
						{data.counts.nav} 个菜单节点
					</span>
				</div>
				<div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-zinc-900 group-hover:text-black">
						全局导航菜单
					</h3>
					<p class="text-xs text-zinc-500 mt-1.5 leading-relaxed">
						编排前台桌面顶部 Header、移动端侧滑抽屉与底部 Footer 的分级链接结构。
					</p>
				</div>
			</div>
			<div class="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-zinc-800 group-hover:text-emerald-700 transition-colors">
				<span>编排导航结构</span>
				<UiIcon icon={ArrowRight} size={14} className="transition-transform group-hover:translate-x-1" />
			</div>
		</a>
	</div>

	<!-- Status / Feedback Alerts -->
	{#if error}
		<div role="alert" class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
			<UiIcon icon={ShieldAlert} size={16} className="shrink-0" />
			<span>{error}</span>
		</div>
	{/if}
	{#if saved}
		<div role="status" class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
			<UiIcon icon={Check} size={16} className="shrink-0" />
			<span>配置已成功保存并即时推送到前台！</span>
		</div>
	{/if}

	<!-- Section Header for Settings -->
	<div class="pt-2">
		<div class="flex items-center gap-2 mb-1">
			<UiIcon icon={SlidersHorizontal} size={18} className="text-zinc-700" />
			<h2 class="text-lg font-display font-bold uppercase tracking-wider text-zinc-900">
				站点基础与运营参数
			</h2>
		</div>
		<p class="text-xs text-zinc-500">
			配置商城的品牌标识、计价结算货币、免邮门槛以及前台运营状态
		</p>
	</div>

	<!-- Settings Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
		<!-- Left Column (2 cols): Brand & Commerce Settings -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Card A: 品牌与标识 -->
			<section class="bg-white border border-zinc-200 rounded-card p-6 shadow-xs space-y-5">
				<div class="flex items-center justify-between border-b border-zinc-100 pb-4">
					<div class="flex items-center gap-2.5">
						<div class="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
							<UiIcon icon={Store} size={16} />
						</div>
						<div>
							<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-900">品牌名称与标识</h3>
							<p class="text-[11px] text-zinc-400">显示于浏览器标题、前台顶栏与页脚</p>
						</div>
					</div>
					<span class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
						Brand Identity
					</span>
				</div>

				<div class="space-y-4">
					<label class="block">
						<div class="flex items-center justify-between mb-1.5">
							<span class="text-xs font-semibold uppercase tracking-wider text-zinc-700">
								站点品牌名称
							</span>
							<span class="text-[11px] text-zinc-400">
								{String(values.site_name || '').length} / 60
							</span>
						</div>
						<input
							bind:value={values.site_name}
							type="text"
							placeholder="例如：JEVARIE"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
						/>
						<span class="block text-[11px] text-zinc-400 mt-1">
							用于全站 SEO Title、邮件模版与页面 Copyright 落款
						</span>
					</label>

					<!-- Icon Preview Box -->
					<div class="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div class="flex items-center gap-4">
							{#if data.settings.iconUrl}
								<img
									src={data.settings.iconUrl}
									alt="站点图标"
									class="w-12 h-12 object-contain bg-white border border-zinc-200 rounded-xl p-1 shadow-2xs shrink-0"
								/>
							{:else}
								<div class="w-12 h-12 bg-zinc-200 rounded-xl flex items-center justify-center text-zinc-400 shrink-0">
									<UiIcon icon={ImageIcon} size={20} />
								</div>
							{/if}
							<div>
								<div class="flex items-center gap-2">
									<span class="text-xs font-bold text-zinc-900">站点图标 (Icon / Favicon)</span>
									<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
										云存储已就绪
									</span>
								</div>
								<p class="text-[11px] text-zinc-500 mt-0.5">
									支持 SVG, PNG, WebP 高保真图标。如需替换文件，请前往 PocketBase 数据后台直传。
								</p>
							</div>
						</div>
						{#if data.pocketbaseUrl}
							<a
								href={`${data.pocketbaseUrl}/_/`}
								target="_blank"
								rel="noopener noreferrer"
								class="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shrink-0 inline-flex items-center gap-1 shadow-2xs"
							>
								替换图标 <UiIcon icon={ExternalLink} size={12} />
							</a>
						{/if}
					</div>
				</div>
			</section>

			<!-- Card B: 交易结算与免邮门槛 -->
			<section class="bg-white border border-zinc-200 rounded-card p-6 shadow-xs space-y-5">
				<div class="flex items-center justify-between border-b border-zinc-100 pb-4">
					<div class="flex items-center gap-2.5">
						<div class="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
							<UiIcon icon={DollarSign} size={16} />
						</div>
						<div>
							<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-900">交易币种与运费门槛</h3>
							<p class="text-[11px] text-zinc-400">定义前台商品计价符号及免邮包邮规则</p>
						</div>
					</div>
					<span class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
						Commerce Rules
					</span>
				</div>

				<div class="space-y-4">
					<!-- Quick currency presets -->
					<div>
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
							常见币种快捷套用
						</span>
						<div class="flex flex-wrap gap-2">
							{#each CURRENCY_PRESETS as preset (preset.code)}
								<button
									type="button"
									onclick={() => applyCurrencyPreset(preset.code, preset.symbol)}
									class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors {values.currency_code ===
									preset.code
										? 'bg-zinc-900 text-white border-zinc-900'
										: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}"
								>
									{preset.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<label class="block">
							<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
								货币代码 (3 位 ISO)
							</span>
							<input
								bind:value={values.currency_code}
								type="text"
								maxlength="3"
								placeholder="例如：USD"
								class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm uppercase font-mono text-zinc-900 outline-none focus:border-zinc-900"
							/>
							<span class="block text-[11px] text-zinc-400 mt-1">
								用于 Stripe / PayPal 结账汇率与对账凭证
							</span>
						</label>

						<label class="block">
							<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
								货币显示符号
							</span>
							<input
								bind:value={values.currency_symbol}
								type="text"
								maxlength="3"
								placeholder="例如：$"
								class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
							/>
							<span class="block text-[11px] text-zinc-400 mt-1">
								前台商品卡片、购物车与结算单前缀符号
							</span>
						</label>
					</div>

					<label class="block pt-2">
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
							全站满额免邮门槛
						</span>
						<div class="relative max-w-sm">
							<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-zinc-400">
								{values.currency_symbol || '$'}
							</div>
							<input
								bind:value={values.shipping_threshold}
								type="number"
								min="0"
								step="1"
								placeholder="例如：150"
								class="w-full bg-white border border-zinc-300 rounded-xl pl-8 pr-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
							/>
						</div>
						<span class="block text-[11px] text-zinc-400 mt-1">
							购物车金额达到该数值时，前台自动减免运费并显示“已享免邮”徽章
						</span>
					</label>
				</div>
			</section>
		</div>

		<!-- Right Column (1 col): System Maintenance & Quick Info -->
		<div class="space-y-6">
			<!-- Card C: 站点运营状态 (Maintenance Mode) -->
			<section class="bg-white border border-zinc-200 rounded-card p-6 shadow-xs space-y-4">
				<div class="flex items-center gap-2.5 border-b border-zinc-100 pb-4">
					<div class="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
						<UiIcon icon={ShieldAlert} size={16} />
					</div>
					<div>
						<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-900">维护与服务模式</h3>
						<p class="text-[11px] text-zinc-400">紧急维护或店面闭店接单开关</p>
					</div>
				</div>

				<div class="p-4 rounded-xl border {values.maintenance_mode ? 'bg-amber-50/60 border-amber-200' : 'bg-zinc-50 border-zinc-200'} space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold text-zinc-900">
							{values.maintenance_mode ? '维护模式已开启' : '全网正常营业中'}
						</span>
						<button
							type="button"
							role="switch"
							aria-checked={values.maintenance_mode === true}
							aria-label="切换维护模式"
							onclick={() => (values.maintenance_mode = !(values.maintenance_mode === true))}
							class="relative inline-flex w-11 h-6 items-center rounded-full transition-colors {values.maintenance_mode === true
								? 'bg-amber-500'
								: 'bg-zinc-300'}"
						>
							<span
								class="inline-block w-4 h-4 rounded-full bg-white transition-transform {values.maintenance_mode === true
									? 'translate-x-6'
									: 'translate-x-1'}"
							></span>
						</button>
					</div>

					<p class="text-[11px] {values.maintenance_mode ? 'text-amber-800' : 'text-zinc-500'} leading-relaxed">
						{#if values.maintenance_mode}
							⚠️ 开启后，所有未经授权的前台访客将直接重定向至专属维护告示页，无法下单或加购；管理员后台正常可用。
						{:else}
							顾客可正常访问商品目录、加入购物车并使用 Stripe 完成下单支付。
						{/if}
					</p>
				</div>
			</section>

			<!-- Quick Tips Card -->
			<section class="bg-zinc-50 border border-zinc-200 rounded-card p-5 space-y-3 text-xs text-zinc-600">
				<h4 class="font-bold uppercase tracking-wider text-zinc-800 text-[11px]">
					💡 内容管理专家建议
				</h4>
				<ul class="space-y-2 text-[11px] text-zinc-500 leading-relaxed list-disc list-inside">
					<li>
						<strong>页面视觉排版</strong>：请前往「页面排版」子页调整首页海报、双拼大片与品类网格。
					</li>
					<li>
						<strong>多媒体与高分辨率图</strong>：海报大图已接入 CDN 智能切图与 WebP 动态压缩。
					</li>
					<li>
						<strong>发布前校验</strong>：建议每次修改后点击上方「浏览前台」进行实机视觉与跨端检验。
					</li>
				</ul>
			</section>
		</div>
	</div>

	<!-- Floating Bottom Action Bar -->
	<div
		class="fixed bottom-0 left-0 lg:left-52 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-zinc-200 px-6 py-3.5 shadow-lg flex items-center justify-between"
	>
		<div class="flex items-center gap-3 text-xs">
			{#if isDirty}
				<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
					<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
					检测到未保存的更改
				</span>
			{:else}
				<span class="text-zinc-400 font-medium">
					当前配置已与生产环境完全同步
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-3">
			{#if isDirty}
				<button
					type="button"
					onclick={() => (values = { ...initialValues })}
					class="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
				>
					放弃更改
				</button>
			{/if}
			<button
				type="button"
				onclick={save}
				disabled={saving || !isDirty}
				class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 shadow-xs transition-all"
			>
				{#if saving}
					<span>保存中…</span>
				{:else}
					<UiIcon icon={Check} size={14} />
					<span>保存配置</span>
				{/if}
			</button>
		</div>
	</div>
</div>
