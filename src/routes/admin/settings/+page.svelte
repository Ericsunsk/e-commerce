<script lang="ts">
	import { Info } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const rows = $derived([
		{
			label: 'PocketBase 远端地址',
			value: data.pocketbaseUrl,
			status: data.pocketbaseUrl ? '已连接' : '未设置',
			statusClass: data.pocketbaseUrl
				? 'bg-emerald-50 text-emerald-700 border-emerald-200'
				: 'bg-rose-50 text-rose-700 border-rose-200'
		},
		{
			label: 'Cloudflare R2 CDN',
			value: data.cdnConfigured ? '已启用' : '未配置（使用 PocketBase 源站）',
			status: data.cdnConfigured ? '已启用' : '可选',
			statusClass: data.cdnConfigured
				? 'bg-emerald-50 text-emerald-700 border-emerald-200'
				: 'bg-zinc-100 text-zinc-600 border-zinc-200'
		},
		{
			label: 'Stripe 公钥',
			value: data.stripePublishableConfigured ? '已加载' : '缺失 pk_test_...',
			status: data.stripePublishableConfigured ? '已配置' : '需要处理',
			statusClass: data.stripePublishableConfigured
				? 'bg-emerald-50 text-emerald-700 border-emerald-200'
				: 'bg-rose-50 text-rose-700 border-rose-200'
		}
	]);
</script>

<svelte:head>
	<title>设置 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-3xl">
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
			系统环境设置
		</h1>
		<p class="text-xs text-zinc-500 mt-1">后端基础设施与支付网关连接状态</p>
	</div>

	<!-- Info Card -->
	<div
		class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-zinc-100"
	>
		{#each rows as row (row.label)}
			<div
				class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 hover:bg-zinc-50/50 transition-colors"
			>
				<div>
					<span class="text-xs font-bold uppercase tracking-wider text-zinc-800">{row.label}</span>
					<p class="text-xs text-zinc-500 font-mono mt-0.5 break-all">{row.value}</p>
				</div>
				<span
					class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 {row.statusClass}"
				>
					{row.status}
				</span>
			</div>
		{/each}
	</div>

	<!-- Hint Alert -->
	<div
		class="flex items-start gap-3 p-4 rounded-xl bg-zinc-100/80 border border-zinc-200 text-xs text-zinc-600"
	>
		<UiIcon icon={Info} size={16} class="text-zinc-500 shrink-0" />
		<p class="leading-relaxed">
			后端凭证（PocketBase 管理员账号、Stripe Secret Key、webhook
			密钥）统一通过环境变量管理。配置项见 <span class="font-mono text-zinc-800 font-semibold"
				>.env.example</span
			>。
		</p>
	</div>
</div>
