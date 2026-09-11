<script lang="ts">
	import { ShieldCheck, KeyRound, Mail } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const switches = $derived([
		{ label: '密码登录', desc: '邮箱 + 密码', on: data.methods.passwordEnabled },
		{ label: '多因素 MFA', desc: 'TOTP 二次验证', on: data.methods.mfaEnabled },
		{ label: '邮箱 OTP', desc: '一次性验证码', on: data.methods.otpEnabled },
		{ label: 'OAuth 总开关', desc: '第三方登录', on: data.methods.oauthEnabled }
	]);

	// ---- Email templates editor ----
	type TemplateKey = 'verification' | 'password-reset' | 'email-change';
	let activeTemplate = $state<TemplateKey>('verification');
	// svelte-ignore state_referenced_locally
	let draft = $state({
		subject: data.templates.verification.subject,
		body: data.templates.verification.body,
		actionUrl: data.templates.verification.actionUrl
	});
	let tplSaving = $state(false);
	let tplError = $state('');
	let tplSaved = $state(false);

	function selectTemplate(key: TemplateKey) {
		activeTemplate = key;
		const current = data.templates[key];
		draft = { subject: current.subject, body: current.body, actionUrl: current.actionUrl };
		tplError = '';
		tplSaved = false;
	}

	async function saveTemplate() {
		tplSaving = true;
		tplError = '';
		tplSaved = false;
		try {
			const res = await fetch('/api/admin/auth/templates', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: activeTemplate, template: draft })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			data.templates[activeTemplate] = body.template;
			tplSaved = true;
			setTimeout(() => (tplSaved = false), 2000);
		} catch (e: unknown) {
			tplError = e instanceof Error ? e.message : '保存失败';
		} finally {
			tplSaving = false;
		}
	}

	const activeDef = $derived(
		data.templateDefs.find((d) => d.key === activeTemplate) ?? data.templateDefs[0]
	);
</script>

<svelte:head>
	<title>认证方式 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-3xl">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
				认证方式
			</h1>
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

	<div
		class="bg-white border border-zinc-200 rounded-card overflow-hidden divide-y divide-zinc-100"
	>
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

	<section class="bg-white border border-zinc-200 rounded-card overflow-hidden">
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

	<section class="bg-white border border-zinc-200 rounded-card overflow-hidden">
		<div class="p-5 border-b border-zinc-100 flex items-center gap-2">
			<UiIcon icon={Mail} size={16} class="text-zinc-500" />
			<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">事务邮件模板</h2>
		</div>

		<div class="flex gap-2 p-5 pb-0">
			{#each data.templateDefs as def (def.key)}
				<button
					type="button"
					onclick={() => selectTemplate(def.key)}
					class="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border {activeTemplate ===
					def.key
						? 'bg-zinc-900 text-white border-zinc-900'
						: 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}"
				>
					{def.label}
				</button>
			{/each}
		</div>

		<div class="p-5 space-y-4">
			{#if tplError}
				<p role="alert" class="text-xs text-rose-600">{tplError}</p>
			{/if}
			{#if tplSaved}
				<p role="status" class="text-xs text-emerald-600">已保存并即时生效</p>
			{/if}
			<p class="text-[11px] text-zinc-400">可用变量：{activeDef.variables}</p>

			<label class="block">
				<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					主题 *
				</span>
				<input
					bind:value={draft.subject}
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
				/>
			</label>
			<label class="block">
				<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					正文 HTML *
				</span>
				<textarea
					bind:value={draft.body}
					rows="10"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
				></textarea>
			</label>
			<label class="block">
				<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					跳转地址（选填）
				</span>
				<input
					bind:value={draft.actionUrl}
					placeholder="https://…"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
				/>
			</label>

			<button
				type="button"
				onclick={saveTemplate}
				disabled={tplSaving}
				class="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
			>
				{tplSaving ? '保存中…' : '保存模板'}
			</button>
		</div>
	</section>
</div>
