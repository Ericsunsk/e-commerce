<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { CircleAlert, Plus, Tag, X } from 'lucide-svelte';
	import { UiIcon } from '$shared/ui';
	import { ADMIN_BUTTONS } from '$shared/kernel/design-tokens';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.coupons.map((c) => ({ ...c })));
	let pendingIds = new SvelteSet<string>();
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
		pendingIds.add(id);
		error = '';

		try {
			const res = await fetch(`/api/admin/coupons/${id}/toggle`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: next })
			});
			if (!res.ok) throw new Error(`切换失败 (${res.status})`);
		} catch (e: unknown) {
			rows = previous;
			error = e instanceof Error ? e.message : '切换失败';
		} finally {
			pendingIds.delete(id);
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
			if (!res.ok) throw new Error(body.error || `创建失败 (${res.status})`);
			rows = [body.coupon, ...rows];
			drawerOpen = false;
			form = {
				code: '',
				type: 'percentage',
				value: '',
				min_order_amount: '',
				usage_limit: '',
				expire_date: ''
			};
		} catch (e: unknown) {
			formError = e instanceof Error ? e.message : '创建失败';
		} finally {
			saving = false;
		}
	}

	function usageLabel(row: (typeof rows)[number]): string {
		return row.usageLimit != null
			? `${row.usageCount} / ${row.usageLimit}`
			: `已用 ${row.usageCount} 次`;
	}
</script>

<svelte:head>
	<title>优惠券 | 管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
				促销与优惠券
			</h1>
			<p class="text-xs text-zinc-500 mt-1">管理营销折扣码、使用上限与过期时间</p>
		</div>
		<button
			type="button"
			onclick={() => (drawerOpen = true)}
			class={ADMIN_BUTTONS.primary}
		>
			<UiIcon icon={Plus} size={16} />
			新建优惠券
		</button>
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

	<!-- Table Card -->
	<div class="bg-white border border-zinc-200 rounded-card shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left min-w-[720px]">
				<thead>
					<tr
						class="bg-zinc-50/80 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500"
					>
						<th class="px-5 py-3.5">券码</th>
						<th class="px-5 py-3.5">优惠</th>
						<th class="px-5 py-3.5 text-right">已核销</th>
						<th class="px-5 py-3.5">过期与门槛</th>
						<th class="px-5 py-3.5 text-right">状态</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each rows as row (row.id)}
						<tr class="hover:bg-zinc-50/70 transition-colors">
							<td class="px-5 py-3.5">
								<span
									class="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 tracking-wider"
								>
									{row.code}
								</span>
							</td>
							<td class="px-5 py-3.5 text-sm font-bold text-zinc-900">
								{row.type === 'percentage' ? `${row.value}% 减免` : `$${row.value} 减免`}
							</td>
							<td class="px-5 py-3.5 text-xs text-right font-medium text-zinc-600">
								{usageLabel(row)}
							</td>
							<td class="px-5 py-3.5 text-xs text-zinc-600">
								<div class="flex flex-col gap-0.5">
									<span
										>{row.expireDate ? `有效期至 ${row.expireDate.slice(0, 10)}` : '长期有效'}</span
									>
									{#if row.minOrderAmount != null}
										<span class="text-[11px] text-zinc-400">最低消费：${row.minOrderAmount}</span>
									{/if}
								</div>
							</td>
							<td class="px-5 py-3.5 text-right">
								<button
									role="switch"
									aria-checked={row.isActive}
									aria-label="切换{row.code}状态"
									disabled={pendingIds.has(row.id)}
									onclick={() => toggleActive(row.id, !row.isActive)}
									class="relative inline-flex w-11 h-6 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed {row.isActive
										? 'bg-emerald-500'
										: 'bg-zinc-300'} disabled:opacity-50 shadow-inner"
								>
									<span
										class="inline-block w-4 h-4 rounded-full bg-white transition-transform shadow-xs {row.isActive
											? 'translate-x-6'
											: 'translate-x-1'}"
									></span>
								</button>
							</td>
						</tr>
					{/each}
					{#if rows.length === 0}
						<tr>
							<td colspan="5" class="px-5 py-12 text-center text-sm text-zinc-400">
								<UiIcon icon={Tag} size={30} class="text-zinc-300 block mb-2 mx-auto" />
								还没有创建过优惠券。
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Creation drawer -->
{#if drawerOpen}
	<div
		class="fixed inset-0 z-50 overflow-hidden"
		role="dialog"
		aria-modal="true"
		aria-label="新建优惠券"
	>
		<button
			aria-label="关闭"
			class="absolute inset-0 bg-zinc-900/40 backdrop-blur-xs transition-opacity cursor-default"
			onclick={() => (drawerOpen = false)}
		></button>
		<aside
			class="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-zinc-200 shadow-2xl p-6 sm:p-8 overflow-y-auto flex flex-col justify-between"
		>
			<div class="space-y-6">
				<div class="flex items-center justify-between pb-4 border-b border-zinc-100">
					<div>
						<h2 class="text-xl font-display font-bold uppercase tracking-wider text-zinc-900">
							新建优惠券
						</h2>
						<p class="text-xs text-zinc-500 mt-0.5">生成可在结账时使用的促销码</p>
					</div>
					<button
						type="button"
						onclick={() => (drawerOpen = false)}
						class={ADMIN_BUTTONS.icon}
						aria-label="关闭"
					>
						<UiIcon icon={X} size={20} />
					</button>
				</div>

				{#if formError}
					<div
						role="alert"
						class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium"
					>
						<UiIcon icon={CircleAlert} size={16} class="shrink-0" />
						<span>{formError}</span>
					</div>
				{/if}

				<div>
					<label
						for="c-code"
						class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
					>
						券码 *
					</label>
					<input
						id="c-code"
						bind:value={form.code}
						placeholder="例如：SUMMER20、VIP15"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono uppercase text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label
							for="c-type"
							class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
						>
							优惠类型
						</label>
						<select
							id="c-type"
							bind:value={form.type}
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
						>
							<option value="percentage">百分比（%）</option>
							<option value="fixed_amount">固定金额（$）</option>
						</select>
					</div>
					<div>
						<label
							for="c-val"
							class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
						>
							面值 *
						</label>
						<input
							id="c-val"
							bind:value={form.value}
							type="number"
							min="0"
							step="any"
							placeholder={form.type === 'percentage' ? '15' : '20'}
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label
							for="c-min"
							class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
						>
							最低消费（$）
						</label>
						<input
							id="c-min"
							bind:value={form.min_order_amount}
							type="number"
							min="0"
							step="any"
							placeholder="选填"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
						/>
					</div>
					<div>
						<label
							for="c-cap"
							class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
						>
							发放上限
						</label>
						<input
							id="c-cap"
							bind:value={form.usage_limit}
							type="number"
							min="1"
							step="1"
							placeholder="选填"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
						/>
					</div>
				</div>

				<div>
					<label
						for="c-exp"
						class="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
					>
						过期日期
					</label>
					<input
						id="c-exp"
						bind:value={form.expire_date}
						type="date"
						class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
					/>
				</div>
			</div>

			<div class="flex items-center gap-3 pt-6 border-t border-zinc-100">
				<button
					type="button"
					onclick={() => (drawerOpen = false)}
					class="{ADMIN_BUTTONS.secondary} flex-1"
				>
					取消
				</button>
				<button
					type="button"
					onclick={createCoupon}
					disabled={saving || !form.code.trim() || !form.value}
					class="{ADMIN_BUTTONS.primary} flex-1"
				>
					{saving ? '创建中…' : '创建优惠券'}
				</button>
			</div>
		</aside>
	</div>
{/if}
