<script lang="ts">
	import { onMount } from 'svelte';
	import { Info, Eye, EyeOff, Copy, Check, PlugZap } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ---- Stripe gateway card state ----
	interface GatewayView {
		source: 'database' | 'env' | '';
		secretMasked: string;
		webhookMasked: string;
	}

	let gateway = $state<GatewayView>({ source: '', secretMasked: '', webhookMasked: '' });
	let gatewayError = $state('');
	let form = $state({
		publishableKey: '',
		secretKey: '',
		webhookSecret: '',
		enabled: true
	});
	let showSecret = $state(false);
	let showWebhook = $state(false);
	let saving = $state(false);
	let testing = $state(false);
	let connection = $state<{ ok: boolean; message: string } | null>(null);
	let webhookUrl = $state('');
	let copied = $state(false);

	// ---- SMTP card state ----
	let smtp = $state({
		host: '',
		port: 587,
		username: '',
		authMethod: 'LOGIN',
		tls: true,
		enabled: false,
		fromAddress: '',
		fromName: '',
		hasPassword: false
	});
	let smtpPassword = $state('');
	let showSmtpPassword = $state(false);
	let smtpError = $state('');
	let smtpSaving = $state(false);
	let mailTo = $state('');
	let mailTemplate = $state('verification');
	let mailTesting = $state(false);
	let mailResult = $state<{ ok: boolean; message: string } | null>(null);

	async function loadSmtp() {
		try {
			const res = await fetch('/api/admin/smtp-settings');
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || '加载邮件配置失败');
			const s = body.settings;
			smtp = {
				host: s.host,
				port: s.port,
				username: s.username,
				authMethod: s.authMethod,
				tls: s.tls,
				enabled: s.enabled,
				fromAddress: s.fromAddress,
				fromName: s.fromName,
				hasPassword: s.hasPassword
			};
		} catch (e: unknown) {
			smtpError = e instanceof Error ? e.message : '加载邮件配置失败';
		}
	}

	async function saveSmtp() {
		smtpSaving = true;
		smtpError = '';
		try {
			const payload: Record<string, unknown> = {
				host: smtp.host.trim(),
				port: Number(smtp.port),
				username: smtp.username.trim(),
				authMethod: smtp.authMethod,
				tls: smtp.tls,
				enabled: smtp.enabled,
				fromAddress: smtp.fromAddress.trim(),
				fromName: smtp.fromName.trim()
			};
			if (smtpPassword.trim()) payload.password = smtpPassword.trim();
			const res = await fetch('/api/admin/smtp-settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			smtpPassword = '';
			await loadSmtp();
		} catch (e: unknown) {
			smtpError = e instanceof Error ? e.message : '保存失败';
		} finally {
			smtpSaving = false;
		}
	}

	async function sendTestMail() {
		mailTesting = true;
		mailResult = null;
		try {
			const res = await fetch('/api/admin/smtp/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ toEmail: mailTo.trim(), template: mailTemplate })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '发送失败');
			mailResult = { ok: body.ok === true, message: body.message || '已发送' };
		} catch (e: unknown) {
			mailResult = { ok: false, message: e instanceof Error ? e.message : '发送失败' };
		} finally {
			mailTesting = false;
		}
	}

	onMount(async () => {
		webhookUrl = `${window.location.origin}/api/webhooks/stripe`;
		await loadSmtp();
		await loadAdvanced();
		try {
			const res = await fetch('/api/admin/payment-settings');
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || '加载支付配置失败');
			const settings = body.settings;
			gateway = {
				source: settings.source,
				secretMasked: settings.secretMasked,
				webhookMasked: settings.webhookMasked
			};
			form.publishableKey = '';
			form.enabled = settings.enabled;
		} catch (e: unknown) {
			gatewayError = e instanceof Error ? e.message : '加载支付配置失败';
		}
	});

	async function saveGateway() {
		saving = true;
		gatewayError = '';
		try {
			const payload: Record<string, unknown> = { enabled: form.enabled };
			if (form.publishableKey.trim()) payload.publishableKey = form.publishableKey.trim();
			if (form.secretKey.trim()) payload.secretKey = form.secretKey.trim();
			if (form.webhookSecret.trim()) payload.webhookSecret = form.webhookSecret.trim();
			const res = await fetch('/api/admin/payment-settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			gateway = {
				source: body.settings.source,
				secretMasked: body.settings.secretMasked,
				webhookMasked: body.settings.webhookMasked
			};
			form.secretKey = '';
			form.webhookSecret = '';
			form.enabled = body.settings.enabled;
		} catch (e: unknown) {
			gatewayError = e instanceof Error ? e.message : '保存失败';
		} finally {
			saving = false;
		}
	}

	async function testConnection() {
		testing = true;
		connection = null;
		try {
			const res = await fetch('/api/admin/payment/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form.secretKey.trim() ? { secretKey: form.secretKey.trim() } : {})
			});
			const body = await res.json().catch(() => ({}));
			connection = { ok: body.ok === true, message: body.message || '测试完成' };
		} catch {
			connection = { ok: false, message: '测试请求失败' };
		} finally {
			testing = false;
		}
	}

	async function copyWebhookUrl() {
		if (!webhookUrl) return;
		try {
			await navigator.clipboard.writeText(webhookUrl);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard unavailable — user can copy manually.
		}
	}

	// ---- Advanced: S3 + backup schedule ----
	let s3 = $state({
		enabled: false,
		bucket: '',
		region: '',
		endpoint: '',
		hasAccessKey: false,
		hasSecret: false,
		forcePathStyle: true
	});
	let s3AccessKey = $state('');
	let s3Secret = $state('');
	let showS3Secret = $state(false);
	let s3Error = $state('');
	let s3Saving = $state(false);
	let s3Testing = $state(false);
	let s3Result = $state<{ ok: boolean; message: string } | null>(null);

	let schedule = $state({ cron: '0 0 * * *', cronMaxKeep: 3 });
	let scheduleError = $state('');
	let scheduleSaving = $state(false);

	async function loadAdvanced() {
		try {
			const [s3Res, schedRes] = await Promise.all([
				fetch('/api/admin/s3-settings'),
				fetch('/api/admin/backup-schedule')
			]);
			const s3Body = await s3Res.json();
			if (!s3Res.ok) throw new Error(s3Body.error || '加载 S3 配置失败');
			Object.assign(s3, s3Body.settings);
			const schedBody = await schedRes.json();
			if (!schedRes.ok) throw new Error(schedBody.error || '加载备份计划失败');
			schedule = { cron: schedBody.settings.cron, cronMaxKeep: schedBody.settings.cronMaxKeep };
		} catch (e: unknown) {
			s3Error = e instanceof Error ? e.message : '加载高级配置失败';
		}
	}

	async function saveS3() {
		s3Saving = true;
		s3Error = '';
		try {
			const payload: Record<string, unknown> = {
				enabled: s3.enabled,
				bucket: s3.bucket.trim(),
				region: s3.region.trim(),
				endpoint: s3.endpoint.trim(),
				forcePathStyle: s3.forcePathStyle
			};
			if (s3AccessKey.trim()) payload.accessKey = s3AccessKey.trim();
			if (s3Secret.trim()) payload.secret = s3Secret.trim();
			const res = await fetch('/api/admin/s3-settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			Object.assign(s3, body.settings);
			s3AccessKey = '';
			s3Secret = '';
		} catch (e: unknown) {
			s3Error = e instanceof Error ? e.message : '保存失败';
		} finally {
			s3Saving = false;
		}
	}

	async function testS3(filesystem: string) {
		s3Testing = true;
		s3Result = null;
		try {
			const res = await fetch(`/api/admin/s3/test?filesystem=${filesystem}`, { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			s3Result = { ok: body.ok === true, message: body.message || '测试完成' };
		} catch {
			s3Result = { ok: false, message: '测试请求失败' };
		} finally {
			s3Testing = false;
		}
	}

	async function saveSchedule() {
		scheduleSaving = true;
		scheduleError = '';
		try {
			const res = await fetch('/api/admin/backup-schedule', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cron: schedule.cron.trim(),
					cronMaxKeep: Number(schedule.cronMaxKeep)
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || '保存失败');
			schedule = { cron: body.settings.cron, cronMaxKeep: body.settings.cronMaxKeep };
		} catch (e: unknown) {
			scheduleError = e instanceof Error ? e.message : '保存失败';
		} finally {
			scheduleSaving = false;
		}
	}

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

	<!-- Stripe gateway card -->
	<section class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
		<div class="p-5 border-b border-zinc-100 flex items-center justify-between">
			<div>
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">Stripe 支付网关</h2>
				<p class="text-[11px] text-zinc-400 mt-0.5">
					{#if gateway.source === 'database'}
						当前生效：数据库配置
					{:else if gateway.source === 'env'}
						当前生效：环境变量（未在数据库中配置）
					{:else}
						正在加载配置…
					{/if}
				</p>
			</div>
			<label class="flex items-center gap-2 text-[11px] font-semibold text-zinc-600">
				<button
					type="button"
					role="switch"
					aria-checked={form.enabled}
					aria-label="启用 Stripe 支付"
					onclick={() => (form.enabled = !form.enabled)}
					class="relative inline-flex w-10 h-5 items-center rounded-full transition-colors {form.enabled
						? 'bg-emerald-500'
						: 'bg-zinc-300'}"
				>
					<span
						class="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform {form.enabled
							? 'translate-x-5'
							: 'translate-x-1'}"
					></span>
				</button>
				启用支付
			</label>
		</div>

		<div class="p-5 space-y-4">
			{#if gatewayError}
				<p role="alert" class="text-xs text-rose-600">{gatewayError}</p>
			{/if}

			<label class="block">
				<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					Publishable Key（公钥）
				</span>
				<input
					bind:value={form.publishableKey}
					placeholder="pk_test_…（留空则不修改）"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
				/>
			</label>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						Secret Key（私钥）{gateway.secretMasked
							? `当前：${gateway.secretMasked}`
							: '（未配置）'}
					</span>
					<div class="relative">
						<input
							bind:value={form.secretKey}
							type={showSecret ? 'text' : 'password'}
							placeholder="sk_test_…（留空则不修改）"
							autocomplete="new-password"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 pr-11 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
						/>
						<button
							type="button"
							onclick={() => (showSecret = !showSecret)}
							aria-label={showSecret ? '隐藏私钥' : '显示私钥'}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800"
						>
							<UiIcon icon={showSecret ? EyeOff : Eye} size={16} />
						</button>
					</div>
				</label>

				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						Webhook Secret {gateway.webhookMasked ? `当前：${gateway.webhookMasked}` : '（未配置）'}
					</span>
					<div class="relative">
						<input
							bind:value={form.webhookSecret}
							type={showWebhook ? 'text' : 'password'}
							placeholder="whsec_…（留空则不修改）"
							autocomplete="new-password"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 pr-11 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
						/>
						<button
							type="button"
							onclick={() => (showWebhook = !showWebhook)}
							aria-label={showWebhook ? '隐藏密钥' : '显示密钥'}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800"
						>
							<UiIcon icon={showWebhook ? EyeOff : Eye} size={16} />
						</button>
					</div>
				</label>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={saveGateway}
					disabled={saving}
					class="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
				>
					{saving ? '保存中…' : '保存配置'}
				</button>
				<button
					type="button"
					onclick={testConnection}
					disabled={testing}
					class="px-5 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 disabled:opacity-50 inline-flex items-center gap-2"
				>
					<UiIcon icon={PlugZap} size={14} />
					{testing ? '测试中…' : '测试连接'}
				</button>
				{#if connection}
					<p
						role="status"
						class="text-xs font-medium {connection.ok ? 'text-emerald-600' : 'text-rose-600'}"
					>
						{connection.message}
					</p>
				{/if}
			</div>

			<div class="pt-2 border-t border-zinc-100">
				<p class="text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					Webhook 回调地址
				</p>
				<div class="flex items-center gap-2">
					<code
						class="flex-1 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 break-all"
					>
						{webhookUrl || '加载中…'}
					</code>
					<button
						type="button"
						onclick={copyWebhookUrl}
						aria-label="复制 Webhook 地址"
						class="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
					>
						<UiIcon icon={copied ? Check : Copy} size={14} />
					</button>
				</div>
				<p class="text-[11px] text-zinc-400 mt-2">
					在 Stripe Dashboard → Developers → Webhooks
					中添加此地址，并订阅事件：`payment_intent.succeeded`、`payment_intent.payment_failed`、`charge.refunded`。
				</p>
			</div>
		</div>
	</section>

	<!-- SMTP card -->
	<section class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
		<div class="p-5 border-b border-zinc-100 flex items-center justify-between">
			<div>
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">SMTP 发信配置</h2>
				<p class="text-[11px] text-zinc-400 mt-0.5">
					{smtp.host ? `当前主机：${smtp.host}` : '未配置，验证/重置类邮件无法发出'}
					{smtp.hasPassword ? ' · 已存密码' : ''}
				</p>
			</div>
			<label class="flex items-center gap-2 text-[11px] font-semibold text-zinc-600">
				<button
					type="button"
					role="switch"
					aria-checked={smtp.enabled}
					aria-label="启用 SMTP 发信"
					onclick={() => (smtp.enabled = !smtp.enabled)}
					class="relative inline-flex w-10 h-5 items-center rounded-full transition-colors {smtp.enabled
						? 'bg-emerald-500'
						: 'bg-zinc-300'}"
				>
					<span
						class="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform {smtp.enabled
							? 'translate-x-5'
							: 'translate-x-1'}"
					></span>
				</button>
				启用发信
			</label>
		</div>

		<div class="p-5 space-y-4">
			{#if smtpError}
				<p role="alert" class="text-xs text-rose-600">{smtpError}</p>
			{/if}

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<label class="block sm:col-span-2">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						SMTP 主机
					</span>
					<input
						bind:value={smtp.host}
						placeholder="smtp.example.com"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
					/>
				</label>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						端口
					</span>
					<input
						bind:value={smtp.port}
						type="number"
						min="1"
						max="65535"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
					/>
				</label>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						账号
					</span>
					<input
						bind:value={smtp.username}
						placeholder="user@example.com"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
					/>
				</label>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						密码{smtp.hasPassword ? '（已存，留空不改）' : ''}
					</span>
					<div class="relative">
						<input
							bind:value={smtpPassword}
							type={showSmtpPassword ? 'text' : 'password'}
							placeholder="留空则不修改"
							autocomplete="new-password"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 pr-11 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
						/>
						<button
							type="button"
							onclick={() => (showSmtpPassword = !showSmtpPassword)}
							aria-label={showSmtpPassword ? '隐藏密码' : '显示密码'}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800"
						>
							<UiIcon icon={showSmtpPassword ? EyeOff : Eye} size={16} />
						</button>
					</div>
				</label>
				<div class="grid grid-cols-2 gap-4">
					<label class="block">
						<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
							认证
						</span>
						<select
							bind:value={smtp.authMethod}
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
						>
							<option value="LOGIN">LOGIN</option>
							<option value="PLAIN">PLAIN</option>
						</select>
					</label>
					<label class="flex items-end gap-2 pb-2.5 text-xs font-semibold text-zinc-700">
						<input type="checkbox" bind:checked={smtp.tls} class="w-4 h-4 accent-emerald-600" />
						TLS
					</label>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						发件人邮箱
					</span>
					<input
						bind:value={smtp.fromAddress}
						placeholder="noreply@example.com"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
					/>
				</label>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						发件人名称
					</span>
					<input
						bind:value={smtp.fromName}
						placeholder="店铺名称"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
					/>
				</label>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={saveSmtp}
					disabled={smtpSaving}
					class="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
				>
					{smtpSaving ? '保存中…' : '保存配置'}
				</button>
			</div>

			<div class="pt-2 border-t border-zinc-100">
				<p class="text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
					发送测试邮件
				</p>
				<div class="flex flex-col sm:flex-row gap-3">
					<input
						bind:value={mailTo}
						type="email"
						placeholder="收件邮箱"
						class="flex-1 bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900"
					/>
					<select
						bind:value={mailTemplate}
						class="bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
					>
						<option value="verification">验证邮件模板</option>
						<option value="password-reset">密码重置模板</option>
						<option value="email-change">换邮模板</option>
					</select>
					<button
						type="button"
						onclick={sendTestMail}
						disabled={mailTesting || !mailTo.trim()}
						class="px-5 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 disabled:opacity-50"
					>
						{mailTesting ? '发送中…' : '发送测试'}
					</button>
				</div>
				{#if mailResult}
					<p
						role="status"
						class="text-xs font-medium mt-2 {mailResult.ok ? 'text-emerald-600' : 'text-rose-600'}"
					>
						{mailResult.message}
					</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- Advanced: S3 + backup schedule -->
	<section class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
		<div class="p-5 border-b border-zinc-100 flex items-center justify-between">
			<div>
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800">存储与备份（高级）</h2>
				<p class="text-[11px] text-zinc-400 mt-0.5">S3 对象存储与自动备份计划</p>
			</div>
			<label class="flex items-center gap-2 text-[11px] font-semibold text-zinc-600">
				<button
					type="button"
					role="switch"
					aria-checked={s3.enabled}
					aria-label="启用 S3 存储"
					onclick={() => (s3.enabled = !s3.enabled)}
					class="relative inline-flex w-10 h-5 items-center rounded-full transition-colors {s3.enabled
						? 'bg-emerald-500'
						: 'bg-zinc-300'}"
				>
					<span
						class="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform {s3.enabled
							? 'translate-x-5'
							: 'translate-x-1'}"
					></span>
				</button>
				启用 S3
			</label>
		</div>

		<div class="p-5 space-y-4">
			{#if s3Error}
				<p role="alert" class="text-xs text-rose-600">{s3Error}</p>
			{/if}

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						Bucket
					</span>
					<input
						bind:value={s3.bucket}
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
					/>
				</label>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						Region
					</span>
					<input
						bind:value={s3.region}
						placeholder="auto"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
					/>
				</label>
			</div>

			<label class="block">
				<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
					Endpoint
				</span>
				<input
					bind:value={s3.endpoint}
					placeholder="https://…"
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
				/>
			</label>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						Access Key{s3.hasAccessKey ? '（已存，留空不改）' : ''}
					</span>
					<input
						bind:value={s3AccessKey}
						autocomplete="new-password"
						placeholder="留空则不修改"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
					/>
				</label>
				<label class="block">
					<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
						Secret{s3.hasSecret ? '（已存，留空不改）' : ''}
					</span>
					<div class="relative">
						<input
							bind:value={s3Secret}
							type={showS3Secret ? 'text' : 'password'}
							placeholder="留空则不修改"
							autocomplete="new-password"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 pr-11 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
						/>
						<button
							type="button"
							onclick={() => (showS3Secret = !showS3Secret)}
							aria-label={showS3Secret ? '隐藏密钥' : '显示密钥'}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800"
						>
							<UiIcon icon={showS3Secret ? EyeOff : Eye} size={16} />
						</button>
					</div>
				</label>
			</div>

			<label class="flex items-center gap-2 text-xs font-semibold text-zinc-700">
				<input
					type="checkbox"
					bind:checked={s3.forcePathStyle}
					class="w-4 h-4 accent-emerald-600"
				/>
				Force Path Style（R2/兼容存储保持开启）
			</label>

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={saveS3}
					disabled={s3Saving}
					class="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
				>
					{s3Saving ? '保存中…' : '保存 S3'}
				</button>
				<button
					type="button"
					onclick={() => testS3('storage')}
					disabled={s3Testing}
					class="px-5 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 disabled:opacity-50"
				>
					{s3Testing ? '测试中…' : '测试存储连通'}
				</button>
				<button
					type="button"
					onclick={() => testS3('backups')}
					disabled={s3Testing}
					class="px-5 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 disabled:opacity-50"
				>
					测试备份连通
				</button>
				{#if s3Result}
					<p
						role="status"
						class="text-xs font-medium {s3Result.ok ? 'text-emerald-600' : 'text-rose-600'}"
					>
						{s3Result.message}
					</p>
				{/if}
			</div>

			<div class="pt-2 border-t border-zinc-100">
				<p class="text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
					自动备份计划
				</p>
				{#if scheduleError}
					<p role="alert" class="text-xs text-rose-600 mb-2">{scheduleError}</p>
				{/if}
				<div class="flex flex-col sm:flex-row gap-3">
					<input
						bind:value={schedule.cron}
						placeholder="0 0 * * *"
						aria-label="备份 cron 表达式"
						class="flex-1 bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-zinc-900"
					/>
					<label class="flex items-center gap-2 text-xs text-zinc-600">
						保留
						<input
							bind:value={schedule.cronMaxKeep}
							type="number"
							min="1"
							max="100"
							class="w-20 bg-white border border-zinc-300 rounded-xl px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
						/>
						份
					</label>
					<button
						type="button"
						onclick={saveSchedule}
						disabled={scheduleSaving}
						class="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
					>
						{scheduleSaving ? '保存中…' : '保存计划'}
					</button>
				</div>
			</div>
		</div>
	</section>

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
