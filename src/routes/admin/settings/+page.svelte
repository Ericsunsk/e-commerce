<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const rows = $derived([
		{
			label: 'PocketBase Remote URL',
			value: data.pocketbaseUrl,
			status: data.pocketbaseUrl ? 'Connected' : 'Unset',
			statusClass: data.pocketbaseUrl ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
		},
		{
			label: 'Cloudflare R2 CDN',
			value: data.cdnConfigured ? 'Active' : 'Not configured (using PocketBase origin)',
			status: data.cdnConfigured ? 'Active' : 'Optional',
			statusClass: data.cdnConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
		},
		{
			label: 'Stripe Publishable Key',
			value: data.stripePublishableConfigured ? 'Loaded' : 'Missing pk_test_...',
			status: data.stripePublishableConfigured ? 'Configured' : 'Action Required',
			statusClass: data.stripePublishableConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
		}
	]);
</script>

<svelte:head>
	<title>Settings | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-6 max-w-3xl">
	<div>
		<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">System Environment Settings</h1>
		<p class="text-xs text-zinc-500 mt-1">Status of connected backend infrastructure and payment gateways</p>
	</div>

	<!-- Info Card -->
	<div class="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-zinc-100">
		{#each rows as row (row.label)}
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 hover:bg-zinc-50/50 transition-colors">
				<div>
					<span class="text-xs font-bold uppercase tracking-wider text-zinc-800">{row.label}</span>
					<p class="text-xs text-zinc-500 font-mono mt-0.5 break-all">{row.value}</p>
				</div>
				<span class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 {row.statusClass}">
					{row.status}
				</span>
			</div>
		{/each}
	</div>

	<!-- Hint Alert -->
	<div class="flex items-start gap-3 p-4 rounded-xl bg-zinc-100/80 border border-zinc-200 text-xs text-zinc-600">
		<span class="material-symbols-outlined text-base text-zinc-500 shrink-0">info</span>
		<p class="leading-relaxed">
			Backend credentials (PocketBase admin credentials, Stripe Secret Key, webhook secrets) are managed strictly via environment variables. See <span class="font-mono text-zinc-800 font-semibold">.env.example</span> for configuration keys.
		</p>
	</div>
</div>
