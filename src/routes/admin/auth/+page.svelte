<script lang="ts">
	import { ShieldCheck, KeyRound } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const switches = $derived([
		{ label: '密码登录', desc: '邮箱 + 密码', on: data.methods.passwordEnabled },
		{ label: '多因素 MFA', desc: 'TOTP 二次验证', on: data.methods.mfaEnabled },
		{ label: '邮箱 OTP', desc: '一次性验证码', on: data.methods.otpEnabled },
		{ label: 'OAuth 总开关', desc: '第三方登录', on: data.methods.oauthEnabled }
	]);
</script>

<svelte:head>
	<title>认证方式 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-3xl">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">认证方式</h1>
			<p class="text-xs text-zinc-500 mt-1">users 表登录方式只读状态（修改请前往 PB 后台）</p>
		</div>
		<a
			href={data.dashboardUrl}
			target="_blank"
			rel="noreferrer"
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50"
		>
			<UiIcon icon={KeyRound} size={14} />
			PB 后台
		</a>
	</div>

	<div class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-zinc-100">
		{#each switches as row (row.label)}
			<div class="flex items-center justify-between gap-3 p-5">
				<div>
					<p class="text-xs font-bold uppercase tracking-wider text-zinc-800">{row.label}</p>
					<p class="text-[11px] text-zinc-400 mt-0.5">{row.desc}</p>
				</div>
				<span
					class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 {row.on
						? 'bg-emerald-50 text-emerald-700 border-emerald-200'
						: 'bg-zinc-100 text-zinc-500 border-zinc-200'}"
				>
					{row.on ? '已启用' : '已关闭'}
				</span>
			</div>
		{/each}
	</div>

	<section class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
		<div class="p-5 border-b border-zinc-100 flex items-center gap-2">
			<UiIcon icon={ShieldCheck} size={16} class="text-zinc-500" />
			<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">OAuth 提供商</h2>
		</div>
		{#if data.methods.providers.length === 0}
			<p class="p-5 text-sm text-zinc-400">未配置任何 OAuth 提供商</p>
		{:else}
			<ul class="divide-y divide-zinc-100">
				{#each data.methods.providers as provider (provider.name)}
					<li class="flex items-center justify-between gap-3 p-5">
						<div>
							<p class="text-sm font-semibold text-zinc-900">{provider.displayName}</p>
							<p class="text-xs text-zinc-400 font-mono mt-0.5">{provider.clientIdMasked}</p>
						</div>
						<span
							class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 {provider.enabled
								? 'bg-emerald-50 text-emerald-700 border-emerald-200'
								: 'bg-zinc-100 text-zinc-500 border-zinc-200'}"
						>
							{provider.enabled ? '生效中' : '未配置'}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
