<script lang="ts">
	import { ArrowLeft, CircleAlert } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { goto } from '$app/navigation';
	import VariantMatrix, { type VariantRow } from '../_VariantMatrix.svelte';

	let title = $state('');
	let description = $state('');
	let price = $state('');
	let currency = $state('USD');
	let isActive = $state(true);
	let variants = $state<VariantRow[]>([]);
	let saving = $state(false);
	let error = $state('');

	async function submit() {
		saving = true;
		error = '';
		try {
			const res = await fetch('/api/admin/products', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					price: Number(price),
					currency,
					is_active: isActive,
					variants: variants.map((v) => ({ ...v, stockQuantity: Number(v.stockQuantity) }))
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `Creation failed (${res.status})`);
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

<div class="space-y-6 max-w-4xl">
	<!-- Back link -->
	<a
		href="/admin/products"
		class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
	>
		<UiIcon icon={ArrowLeft} size={14} />
		返回商品列表
	</a>

	<!-- Header -->
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
			新建商品
		</h1>
		<p class="text-xs text-zinc-500 mt-1">创建时将自动开通 Stripe Product 与 Price</p>
	</div>

	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<UiIcon icon={CircleAlert} size={16} class="shrink-0" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Form Card -->
	<div class="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
		<div>
			<label
				for="prod-title"
				class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2"
			>
				商品标题 *
			</label>
			<input
				id="prod-title"
				bind:value={title}
				placeholder="例如：极简亚麻衬衫"
				class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
			/>
		</div>

		<div>
			<label
				for="prod-desc"
				class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2"
			>
				商品描述
			</label>
			<textarea
				id="prod-desc"
				bind:value={description}
				rows="3"
				placeholder="填写面料、版型与搭配说明..."
				class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
			></textarea>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
			<div>
				<label
					for="prod-price"
					class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2"
				>
					基础售价 *
				</label>
				<div class="relative">
					<span
						class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold"
						>$</span
					>
					<input
						id="prod-price"
						bind:value={price}
						type="number"
						min="0"
						step="0.01"
						placeholder="120.00"
						class="w-full bg-white border border-zinc-300 rounded-xl pl-8 pr-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</div>
			</div>

			<div>
				<label
					for="prod-curr"
					class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2"
				>
					币种
				</label>
				<select
					id="prod-curr"
					bind:value={currency}
					class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
				>
					<option value="USD">USD ($)</option>
					<option value="EUR">EUR (€)</option>
					<option value="GBP">GBP (£)</option>
					<option value="CAD">CAD ($)</option>
				</select>
			</div>

			<div class="flex items-center sm:pt-6">
				<label
					class="flex items-center gap-2.5 cursor-pointer text-xs font-bold uppercase tracking-wider text-zinc-800"
				>
					<input
						type="checkbox"
						bind:checked={isActive}
						class="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
					/>
					发布到店铺前台
				</label>
			</div>
		</div>

		<VariantMatrix bind:variants />

		<div
			class="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4"
		>
			<p class="text-xs text-zinc-400">系统将自动分配对应的 Stripe Product 与 Price ID。</p>
			<button
				onclick={submit}
				disabled={saving || !title.trim() || !price}
				class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
			>
				{#if saving}
					<span
						class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
					></span>
					正在开通 Stripe...
				{:else}
					创建商品
				{/if}
			</button>
		</div>
	</div>
</div>
