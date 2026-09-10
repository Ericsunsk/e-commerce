<script lang="ts">
	import { Newspaper } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	// Intentional snapshot: the form becomes client-owned state after edits.
	let values = $state<Record<string, string | number | boolean>>({ ...data.settings.values });
	let saving = $state(false);
	let error = $state('');
	let saved = $state(false);

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
			saved = true;
			setTimeout(() => (saved = false), 2000);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '保存失败';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>站点内容 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-3xl">
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
			站点内容
		</h1>
		<p class="text-xs text-zinc-500 mt-1">global_settings 站点级配置（图片类请前往 PB 后台）</p>
	</div>

	<nav class="flex gap-2" aria-label="内容管理">
		{#each [{ href: '/admin/content', label: '站点配置' }, { href: '/admin/content/pages', label: '页面管理' }, { href: '/admin/content/navigation', label: '导航管理' }] as tab (tab.href)}
			<a
				href={tab.href}
				aria-current={tab.href === '/admin/content' ? 'page' : undefined}
				class="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border {tab.href ===
				'/admin/content'
					? 'bg-zinc-900 text-white border-zinc-900'
					: 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}"
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	{#if error}
		<p role="alert" class="text-xs text-rose-600">{error}</p>
	{/if}
	{#if saved}
		<p role="status" class="text-xs text-emerald-600">已保存并即时生效</p>
	{/if}

	<section
		class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-zinc-100"
	>
		{#each data.fields as field (field.key)}
			<label class="block p-5">
				<span class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
					{field.label}
				</span>
				{#if field.type === 'boolean'}
					<button
						type="button"
						role="switch"
						aria-checked={values[field.key] === true}
						aria-label={field.label}
						onclick={() => (values[field.key] = !(values[field.key] === true))}
						class="relative inline-flex w-10 h-5 items-center rounded-full transition-colors {values[
							field.key
						] === true
							? 'bg-emerald-500'
							: 'bg-zinc-300'}"
					>
						<span
							class="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform {values[
								field.key
							] === true
								? 'translate-x-5'
								: 'translate-x-1'}"
						></span>
					</button>
				{:else if field.type === 'number'}
					<input
						bind:value={values[field.key]}
						type="number"
						min="0"
						step="any"
						class="w-full max-w-xs bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
					/>
				{:else}
					<input
						bind:value={values[field.key]}
						type="text"
						class="w-full max-w-md bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
					/>
				{/if}
				<span class="block text-[11px] text-zinc-400 mt-1">{field.help}</span>
			</label>
		{/each}

		{#if data.settings.iconUrl}
			<div class="p-5 flex items-center gap-4">
				<img
					src={data.settings.iconUrl}
					alt="站点图标"
					class="w-10 h-10 object-contain border border-zinc-200 rounded-lg"
				/>
				<p class="text-[11px] text-zinc-400">站点图标（只读，图片请前往 PB 后台替换）</p>
			</div>
		{/if}
	</section>

	<button
		type="button"
		onclick={save}
		disabled={saving}
		class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
	>
		<UiIcon icon={Newspaper} size={14} />
		{saving ? '保存中…' : '保存配置'}
	</button>
</div>
