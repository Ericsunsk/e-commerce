<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const rows = $derived([
		{ label: 'PocketBase URL', value: data.pocketbaseUrl },
		{ label: 'R2 CDN', value: data.cdnConfigured ? 'Configured' : 'Not configured' },
		{ label: 'Stripe publishable key', value: data.stripePublishableConfigured ? 'Set' : 'Missing' }
	]);
</script>

<svelte:head>
	<title>Settings | Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h1 class="text-2xl font-display uppercase tracking-widest mb-8">Settings</h1>

<div class="border border-white/10 max-w-2xl">
	{#each rows as row (row.label)}
		<div class="flex justify-between gap-6 px-5 py-4 border-b border-white/10 last:border-0">
			<span class="text-[11px] uppercase tracking-[0.2em] text-white/50">{row.label}</span>
			<span class="text-xs text-white break-all text-right">{row.value}</span>
		</div>
	{/each}
</div>

<p class="text-[11px] text-white/40 mt-6 max-w-2xl">
	Secrets are managed via environment variables. See <span class="font-mono">.env.example</span> for the
	full list.
</p>
