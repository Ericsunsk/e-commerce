<script lang="ts">
	import {
		ExternalLink,
		Store,
		DollarSign,
		ShieldAlert,
		Check,
		Globe,
		ImageIcon
	} from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import {
		ADMIN_BUTTONS,
		ADMIN_PAGE,
		ADMIN_SEGMENTED,
		ADMIN_CARDS,
		ADMIN_FORMS,
		ADMIN_FLOATING_BAR
	} from '$shared/kernel';
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
	<title>站点配置 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="{ADMIN_PAGE.container} max-w-5xl">
	<!-- Top Subnav & External Links -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<nav class={ADMIN_SEGMENTED.wrapper} aria-label="内容管理">
			{#each [
				{ href: '/admin/content', label: '站点配置' },
				{ href: '/admin/content/sections', label: '页面排版' },
				{ href: '/admin/content/pages', label: '页面管理' },
				{ href: '/admin/content/navigation', label: '导航管理' }
			] as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.href === '/admin/content' ? 'page' : undefined}
					class={tab.href === '/admin/content'
						? ADMIN_SEGMENTED.itemActive
						: ADMIN_SEGMENTED.itemInactive}
				>
					{tab.label}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2 shrink-0">
			<a
				href="/"
				target="_blank"
				rel="noopener noreferrer"
				class={ADMIN_BUTTONS.secondarySm}
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
					class={ADMIN_BUTTONS.secondarySm}
					title="在新窗口打开 PocketBase 官方数据管理后台"
				>
					<UiIcon icon={ExternalLink} size={14} />
					<span>PB 后台</span>
				</a>
			{/if}
		</div>
	</div>

	<!-- Page Header -->
	<div>
		<h1 class={ADMIN_PAGE.title}>站点基础配置</h1>
		<p class={ADMIN_PAGE.subtitle}>品牌标识、结算货币、运费门槛与前台运维模式</p>
	</div>

	<!-- Alerts -->
	{#if error}
		<div role="alert" class="p-3.5 bg-rose-50 border border-rose-200 rounded-card text-xs text-rose-700 flex items-center gap-2">
			<UiIcon icon={ShieldAlert} size={15} className="shrink-0" />
			<span>{error}</span>
		</div>
	{/if}
	{#if saved}
		<div role="status" class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-card text-xs text-emerald-700 flex items-center gap-2">
			<UiIcon icon={Check} size={15} className="shrink-0" />
			<span>配置已成功保存并即时推送到前台！</span>
		</div>
	{/if}

	<!-- Settings Sections -->
	<div class="space-y-6">
		<!-- Section 1: 品牌与标识 -->
		<section class={ADMIN_CARDS.base}>
			<div class={ADMIN_CARDS.header}>
				<div class="flex items-center gap-2.5">
					<UiIcon icon={Store} size={16} className="text-zinc-600" />
					<div>
						<h2 class={ADMIN_CARDS.title}>品牌名称与标识</h2>
						<p class={ADMIN_CARDS.subtitle}>显示于浏览器标题、SEO 元标签、邮件与页脚</p>
					</div>
				</div>
			</div>

			<div class="pt-5 space-y-4">
				<div>
					<div class="flex items-center justify-between mb-1.5">
						<label for="site-name-input" class={ADMIN_FORMS.label}>站点品牌名称</label>
						<span class="text-[11px] text-zinc-400 font-mono">
							{String(values.site_name || '').length} / 60
						</span>
					</div>
					<input
						id="site-name-input"
						bind:value={values.site_name}
						type="text"
						placeholder="例如：JEVARIE"
						class={ADMIN_FORMS.input}
					/>
				</div>

				<!-- Icon Preview Box -->
				<div class="p-4 bg-zinc-50 rounded-card border border-zinc-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div class="flex items-center gap-3.5">
						{#if data.settings.iconUrl}
							<img
								src={data.settings.iconUrl}
								alt="站点图标"
								class="w-10 h-10 object-contain bg-white border border-zinc-200 rounded-lg p-1 shrink-0"
							/>
						{:else}
							<div class="w-10 h-10 bg-zinc-200/80 rounded-lg flex items-center justify-center text-zinc-400 shrink-0">
								<UiIcon icon={ImageIcon} size={18} />
							</div>
						{/if}
						<div>
							<div class="text-xs font-semibold text-zinc-900">站点图标 (Favicon)</div>
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
							class={ADMIN_BUTTONS.secondarySm}
						>
							<span>替换图标</span>
							<UiIcon icon={ExternalLink} size={12} />
						</a>
					{/if}
				</div>
			</div>
		</section>

		<!-- Section 2: 交易货币与免邮门槛 -->
		<section class={ADMIN_CARDS.base}>
			<div class={ADMIN_CARDS.header}>
				<div class="flex items-center gap-2.5">
					<UiIcon icon={DollarSign} size={16} className="text-zinc-600" />
					<div>
						<h2 class={ADMIN_CARDS.title}>交易货币与免邮门槛</h2>
						<p class={ADMIN_CARDS.subtitle}>前台商品计价符号、Stripe 结账币种及包邮规则</p>
					</div>
				</div>
			</div>

			<div class="pt-5 space-y-4">
				<!-- Quick currency presets -->
				<div>
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
						常用币种快捷套用
					</span>
					<div class="flex flex-wrap gap-2">
						{#each CURRENCY_PRESETS as preset (preset.code)}
							<button
								type="button"
								onclick={() => applyCurrencyPreset(preset.code, preset.symbol)}
								class={values.currency_code === preset.code
									? ADMIN_BUTTONS.pillActive
									: ADMIN_BUTTONS.pillInactive}
							>
								{preset.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="currency-code-input" class={ADMIN_FORMS.label}>
							货币代码 (3 位 ISO)
						</label>
						<input
							id="currency-code-input"
							bind:value={values.currency_code}
							type="text"
							maxlength="3"
							placeholder="USD"
							class="{ADMIN_FORMS.input} uppercase font-mono"
						/>
						<span class={ADMIN_FORMS.help}>用于 Stripe / PayPal 结账汇率与对账凭证</span>
					</div>

					<div>
						<label for="currency-symbol-input" class={ADMIN_FORMS.label}>
							货币显示符号
						</label>
						<input
							id="currency-symbol-input"
							bind:value={values.currency_symbol}
							type="text"
							maxlength="3"
							placeholder="$"
							class="{ADMIN_FORMS.input} font-medium"
						/>
						<span class={ADMIN_FORMS.help}>前台商品卡片、购物车与结算单前缀符号</span>
					</div>
				</div>

				<div>
					<label for="shipping-threshold-input" class={ADMIN_FORMS.label}>
						全站满额免邮门槛
					</label>
					<div class="relative max-w-xs">
						<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-mono font-bold text-zinc-400">
							{values.currency_symbol || '$'}
						</div>
						<input
							id="shipping-threshold-input"
							bind:value={values.shipping_threshold}
							type="number"
							min="0"
							step="1"
							placeholder="150"
							class="{ADMIN_FORMS.input} pl-8 font-mono"
						/>
					</div>
					<span class={ADMIN_FORMS.help}>购物车小计达到此金额时自动减免运费</span>
				</div>
			</div>
		</section>

		<!-- Section 3: 运营与维护模式 -->
		<section class={ADMIN_CARDS.base}>
			<div class={ADMIN_CARDS.header}>
				<div class="flex items-center gap-2.5">
					<UiIcon icon={ShieldAlert} size={16} className="text-zinc-600" />
					<div>
						<h2 class={ADMIN_CARDS.title}>前台运营与维护模式</h2>
						<p class={ADMIN_CARDS.subtitle}>紧急升级维护或闭店接单总开关</p>
					</div>
				</div>
			</div>

			<div class="pt-5">
				<div class="p-4 rounded-card border {values.maintenance_mode ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-50 border-zinc-200/80'} flex items-start justify-between gap-4">
					<div class="space-y-1">
						<div class="text-xs font-bold text-zinc-900">
							{values.maintenance_mode ? '维护模式已开启' : '正常营业中'}
						</div>
						<p class="text-xs {values.maintenance_mode ? 'text-amber-800' : 'text-zinc-500'} leading-relaxed">
							{#if values.maintenance_mode}
								开启后，所有未经授权的前台访客将重定向至专属维护告示页，无法加购或结算；管理后台仍可正常访问。
							{:else}
								顾客可正常浏览商品目录、加入购物车并完成在线支付。
							{/if}
						</p>
					</div>

					<button
						type="button"
						role="switch"
						aria-checked={values.maintenance_mode === true}
						aria-label="切换维护模式"
						onclick={() => (values.maintenance_mode = !(values.maintenance_mode === true))}
						class="relative inline-flex w-11 h-6 items-center rounded-full transition-colors shrink-0 {values.maintenance_mode === true
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
			</div>
		</section>
	</div>

	<!-- Floating Bottom Action Bar -->
	<div class={ADMIN_FLOATING_BAR.container}>
		<div class="flex items-center gap-3 text-xs">
			{#if isDirty}
				<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
					<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
					未保存的更改
				</span>
			{:else}
				<span class="text-zinc-400 font-medium">已与生产环境同步</span>
			{/if}
		</div>

		<div class="flex items-center gap-2.5">
			{#if isDirty}
				<button
					type="button"
					onclick={() => (values = { ...initialValues })}
					class={ADMIN_BUTTONS.secondary}
				>
					放弃更改
				</button>
			{/if}
			<button
				type="button"
				onclick={save}
				disabled={saving || !isDirty}
				class={ADMIN_BUTTONS.primary}
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
