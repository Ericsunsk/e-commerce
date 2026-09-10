<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	// Intentional snapshot: rows become client-owned state after toggles/creates.
	let rows = $state(data.coupons.map((c) => ({ ...c })));
	let pendingIds = $state(new Set<string>());
	let error = $state('');

	// Creation drawer state
	let drawerOpen = $state(false);
	let saving = $state(false);
	let formError = $state('');
	let form = $state({
		code: '',
		type: 'percentage',
		value: '',
		min_order_amount: '',
		usage_limit: '',
		expire_date: ''
	});

	async function toggleActive(id: string, next: boolean) {
		const previous = rows;
		rows = rows.map((row) => (row.id === id ? { ...row, isActive: next } : row));
		pendingIds = new Set(pendingIds).add(id);
		error = '';

		try {
			const res = await fetch(`/api/admin/coupons/${id}/toggle`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: next })
			});
			if (!res.ok) throw new Error(`Toggle failed (${res.status})`);
		} catch (e: unknown) {
			rows = previous;
			error = e instanceof Error ? e.message : 'Toggle failed';
		} finally {
			const nextPending = new Set(pendingIds);
			nextPending.delete(id);
			pendingIds = nextPending;
		}
	}

	function payload() {
		return {
			code: form.code,
			type: form.type,
			value: Number(form.value),
			...(form.min_order_amount !== '' ? { min_order_amount: Number(form.min_order_amount) } : {}),
			...(form.usage_limit !== '' ? { usage_limit: Number(form.usage_limit) } : {}),
			...(form.expire_date !== '' ? { expire_date: form.expire_date } : {})
		};
	}

	async function createCoupon() {
		saving = true;
		formError = '';
		try {
			const res = await fetch('/api/admin/coupons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload())
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `Creation failed (${res.status})`);
			rows = [body.coupon, ...rows];
			drawerOpen = false;
			form = { code: '', type: 'percentage', value: '', min_order_amount: '', usage_limit: '', expire_date: '' };
		} catch (e: unknown) {
			formError = e instanceof Error ? e.message : 'Creation failed';
		} finally {
			saving = false;
		}
	}

	function usageLabel(row: (typeof rows)[number]): string {
		return row.usageLimit != null ? `${row.usageCount} / ${row.usageLimit}` : `${row.usageCount}`;
	}
</script>

<svelte:head>
	<title>Coupons | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex items-center justify-between mb-8">
	<h1 class="text-2xl font-display uppercase tracking-widest">Coupons</h1>
	<button
		onclick={() => (drawerOpen = true)}
		class="px-5 py-3 bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:opacity-90"
	>
		New Coupon
	</button>
</div>

{#if error}
	<p role="alert" class="text-xs uppercase tracking-widest text-red-400 mb-4">{error}</p>
{/if}

<div class="border border-white/10 overflow-x-auto">
	<table class="w-full text-left min-w-[720px]">
		<thead>
			<tr class="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
				<th class="px-4 py-3">Code</th>
				<th class="px-4 py-3">Discount</th>
				<th class="px-4 py-3 text-right">Redeemed</th>
				<th class="px-4 py-3">Expiry</th>
				<th class="px-4 py-3 text-right">Active</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.id)}
				<tr class="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
					<td class="px-4 py-3">
						<span class="font-mono text-sm bg-white/10 px-2 py-1">{row.code}</span>
					</td>
					<td class="px-4 py-3 text-sm">
						{row.type === 'percentage' ? `${row.value}%` : `$${row.value}`}
					</td>
					<td class="px-4 py-3 text-sm text-right">{usageLabel(row)}</td>
					<td class="px-4 py-3 text-sm text-white/60">
						{row.expireDate ? row.expireDate.slice(0, 10) : '—'}
						{#if row.minOrderAmount != null}
							<span class="block text-[10px]">Min ${row.minOrderAmount}</span>
						{/if}
					</td>
					<td class="px-4 py-3 text-right">
						<button
							role="switch"
							aria-checked={row.isActive}
							aria-label="Toggle {row.code}"
							disabled={pendingIds.has(row.id)}
							onclick={() => toggleActive(row.id, !row.isActive)}
							class="relative inline-flex w-11 h-6 items-center rounded-full transition-colors {row.isActive
								? 'bg-emerald-500'
								: 'bg-white/20'} disabled:opacity-50"
						>
							<span
								class="inline-block w-4 h-4 rounded-full bg-white transition-transform {row.isActive
									? 'translate-x-6'
									: 'translate-x-1'}"
							></span>
						</button>
					</td>
				</tr>
			{/each}
			{#if rows.length === 0}
				<tr>
					<td colspan="5" class="px-4 py-10 text-center text-sm text-white/40">No coupons yet</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<!-- Creation drawer -->
{#if drawerOpen}
	<div class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="New coupon">
		<button
			aria-label="Close"
			class="absolute inset-0 bg-black/70"
			onclick={() => (drawerOpen = false)}
		></button>
		<aside class="absolute right-0 top-0 h-full w-full max-w-md bg-neutral-950 border-l border-white/15 p-8 overflow-y-auto">
			<h2 class="text-xl font-display uppercase tracking-widest mb-6">New Coupon</h2>

			{#if formError}
				<p role="alert" class="text-xs uppercase tracking-widest text-red-400 mb-4">{formError}</p>
			{/if}

			<label class="block mb-4">
				<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Code</span>
				<input
					bind:value={form.code}
					placeholder="SAVE15"
					class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm font-mono uppercase outline-none focus:border-white"
				/>
			</label>

			<div class="grid grid-cols-2 gap-4 mb-4">
				<label class="block">
					<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Type</span>
					<select
						bind:value={form.type}
						class="w-full bg-neutral-950 border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
					>
						<option value="percentage">Percentage %</option>
						<option value="fixed_amount">Fixed $</option>
					</select>
				</label>
				<label class="block">
					<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Value</span>
					<input
						bind:value={form.value}
						type="number"
						min="0"
						step="any"
						placeholder={form.type === 'percentage' ? '15' : '20'}
						class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
					/>
				</label>
			</div>

			<div class="grid grid-cols-2 gap-4 mb-4">
				<label class="block">
					<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Min spend $</span>
					<input
						bind:value={form.min_order_amount}
						type="number"
						min="0"
						step="any"
						placeholder="Optional"
						class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
					/>
				</label>
				<label class="block">
					<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Usage cap</span>
					<input
						bind:value={form.usage_limit}
						type="number"
						min="1"
						step="1"
						placeholder="Optional"
						class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
					/>
				</label>
			</div>

			<label class="block mb-8">
				<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Expiry</span>
				<input
					bind:value={form.expire_date}
					type="date"
					class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm outline-none focus:border-white"
				/>
			</label>

			<div class="flex gap-3">
				<button
					onclick={() => (drawerOpen = false)}
					class="flex-1 border border-white/20 py-3 text-[11px] uppercase tracking-widest hover:bg-white/5"
				>
					Cancel
				</button>
				<button
					onclick={createCoupon}
					disabled={saving || !form.code.trim() || !form.value}
					class="flex-1 bg-white text-black py-3 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Create'}
				</button>
			</div>
		</aside>
	</div>
{/if}
