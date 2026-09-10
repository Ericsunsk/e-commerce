<script lang="ts">
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
			error = e instanceof Error ? e.message : 'Creation failed';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>New Product | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<a href="/admin/products" class="text-[11px] uppercase tracking-widest text-white/50 hover:text-white">
	← Back to Products
</a>

<h1 class="text-2xl font-display uppercase tracking-widest mt-4 mb-8">New Product</h1>

{#if error}
	<p role="alert" class="text-xs uppercase tracking-widest text-red-400 mb-4">{error}</p>
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
		disabled={saving || !title.trim() || !price}
		class="w-full bg-white text-black py-4 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
	>
		{saving ? 'Provisioning Stripe…' : 'Create Product'}
	</button>
	<p class="text-[10px] text-white/30">Stripe Product + Price are provisioned automatically.</p>
</div>
