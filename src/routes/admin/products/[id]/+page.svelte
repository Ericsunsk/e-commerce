<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import VariantMatrix, { type VariantRow } from '../_VariantMatrix.svelte';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	// Intentional snapshot: the form becomes client-owned state after edits.
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

<a href="/admin/products" class="text-[11px] uppercase tracking-widest text-white/50 hover:text-white">
	← Back to Products
</a>

<h1 class="text-2xl font-display uppercase tracking-widest mt-4 mb-2">Edit Product</h1>
<p class="text-xs text-white/40 font-mono mb-8">
	{data.product.slug} · {data.product.stripePriceId ?? 'no stripe price'}
</p>

{#if error}
	<p role="alert" class="text-xs uppercase tracking-widest text-red-400 mb-4">{error}</p>
{/if}
{#if rolled}
	<p role="status" class="text-xs uppercase tracking-widest text-emerald-400 mb-4">
		Saved — Stripe price rolled to a new Price object.
	</p>
{/if}

<div class="max-w-2xl space-y-4">
	<label class="block">
		<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Title</span>
		<input
			bind:value={title}
			class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
		/>
	</label>

	<label class="block">
		<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Description</span>
		<textarea
			bind:value={description}
			rows="3"
			class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
		></textarea>
	</label>

	<div class="grid grid-cols-3 gap-4">
		<label class="block">
			<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Price $</span>
			<input
				bind:value={price}
				type="number"
				min="0"
				step="0.01"
				class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
			/>
		</label>
		<label class="block">
			<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Currency</span>
			<select
				bind:value={currency}
				class="w-full bg-neutral-950 border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
			>
				<option value="USD">USD</option>
				<option value="EUR">EUR</option>
				<option value="GBP">GBP</option>
				<option value="CAD">CAD</option>
			</select>
		</label>
		<div class="flex items-end pb-3">
			<label class="flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/70">
				<input type="checkbox" bind:checked={isActive} class="w-4 h-4 accent-emerald-500" />
				Active
			</label>
		</div>
	</div>

	<VariantMatrix bind:variants />

	<button
		onclick={submit}
		disabled={saving}
		class="w-full bg-white text-black py-4 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
	>
		{saving ? 'Saving…' : 'Save Changes'}
	</button>
	<p class="text-[10px] text-white/30">Changing the price provisions a new Stripe Price (auto roll).</p>
</div>
