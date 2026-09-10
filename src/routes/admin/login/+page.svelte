<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Admin Login</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-neutral-950 px-6">
	<form
		method="POST"
		action="?/login"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
		class="w-full max-w-sm border border-white/10 bg-white/[0.02] p-8"
	>
		<p class="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Restricted Area</p>
		<h1 class="text-2xl font-display uppercase tracking-widest text-white mb-8">Admin Login</h1>

		{#if form?.error}
			<p role="alert" class="text-xs uppercase tracking-widest text-red-400 mb-4">{form.error}</p>
		{/if}

		<label class="block mb-4">
			<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Email</span>
			<input
				name="email"
				type="email"
				required
				autocomplete="username"
				class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm text-white outline-none focus:border-white transition-colors"
			/>
		</label>

		<label class="block mb-8">
			<span class="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Password</span>
			<input
				name="password"
				type="password"
				required
				autocomplete="current-password"
				class="w-full bg-transparent border border-white/20 px-4 py-3 text-sm text-white outline-none focus:border-white transition-colors"
			/>
		</label>

		<input type="hidden" name="redirect" value={data.redirectTo} />

		<button
			type="submit"
			disabled={loading}
			class="w-full bg-white text-black py-4 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
		>
			{#if loading}
				<span class="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
				Signing In...
			{:else}
				Sign In
			{/if}
		</button>
	</form>
</div>
