<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import VariantMatrix, { type VariantRow } from '../_VariantMatrix.svelte';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let title = $state(data.product.title);
	// svelte-ignore state_referenced_locally
	let description = $state(data.product.description);
	// svelte-ignore state_referenced_locally
	let price = $state(String(data.product.priceDollars || ''));
	// svelte-ignore state_referenced_locally
	let currency = $state(data.product.currency.toUpperCase());
	// svelte-ignore state_referenced_locally
	let isActive = $state(data.product.isActive);
	// svelte-ignore state_referenced_locally
	let variants = $state<VariantRow[]>(data.product.variants.map((v) => ({ ...v })));
	let saving = $state(false);
	let error = $state('');
	let rolled = $state(false);

	async function submit() {
		saving = true;
		error = '';
		rolled = false;
		try {
			const res = await fetch(`/api/admin/products/${data.product.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					price: price === '' ? undefined : Number(price),
					currency,
					is_active: isActive,
					variants: variants.map((v) => ({ ...v, stockQuantity: Number(v.stockQuantity) }))
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `Update failed (${res.status})`);
			if (body.product?.priceRolled) {
				rolled = true;
			} else {
				await goto('/admin/products');
			}
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Update failed';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Edit {data.product.title} | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-4xl">
	<!-- Back link -->
	<a
		href="/admin/products"
		class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
	>
		<span class="material-symbols-outlined text-sm">arrow_back</span>
		Back to Products
	</a>

	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
				Edit {data.product.title}
			</h1>
			<div class="flex flex-wrap items-center gap-2 mt-1.5">
				<span class="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
					/{data.product.slug}
				</span>
				{#if data.product.stripePriceId}
					<span class="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
						{data.product.stripePriceId}
					</span>
				{/if}
			</div>
		</div>
	</div>

	{#if error}
		<div
			role="alert"
			class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<span class="material-symbols-outlined text-base shrink-0">error</span>
			<span>{error}</span>
		</div>
	{/if}

	{#if rolled}
		<div
			role="status"
			class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium"
		>
			<span class="material-symbols-outlined text-base shrink-0">check_circle</span>
			<span>Saved successfully — Stripe price rolled to a new Price object to protect historical orders.</span>
		</div>
	{/if}

	<!-- Form Card -->
	<div class="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
		<div>
			<label for="edit-title" class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
				Product Title *
			</label>
			<input
				id="edit-title"
				bind:value={title}
				class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
			/>
		</div>

		<div>
			<label for="edit-desc" class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
				Description
			</label>
			<textarea
				id="edit-desc"
				bind:value={description}
				rows="3"
				class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
			></textarea>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
			<div>
				<label for="edit-price" class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
					Price *
				</label>
				<div class="relative">
					<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">$</span>
					<input
						id="edit-price"
						bind:value={price}
						type="number"
						min="0"
						step="0.01"
						class="w-full bg-white border border-zinc-300 rounded-xl pl-8 pr-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</div>
			</div>

			<div>
				<label for="edit-curr" class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
					Currency
				</label>
				<select
					id="edit-curr"
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
				<label class="flex items-center gap-2.5 cursor-pointer text-xs font-bold uppercase tracking-wider text-zinc-800">
					<input
						type="checkbox"
						bind:checked={isActive}
						class="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
					/>
					Visible on Storefront
				</label>
			</div>
		</div>

		<VariantMatrix bind:variants />

		<div class="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
			<p class="text-xs text-zinc-400">
				Updating the base price automatically archives old prices and generates a fresh Stripe Price.
			</p>
			<button
				onclick={submit}
				disabled={saving}
				class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
			>
				{#if saving}
					<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
					Saving Changes...
				{:else}
					Save Changes
				{/if}
			</button>
		</div>
	</div>
</div>
