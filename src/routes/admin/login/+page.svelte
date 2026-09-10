<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Admin Sign In | JEVARIE</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12">
	<div class="w-full max-w-md">
		<!-- Brand & Heading -->
		<div class="text-center mb-8">
			<div class="inline-flex w-12 h-12 rounded-xl bg-zinc-900 text-white items-center justify-center font-bold text-lg tracking-wider mb-4 shadow-sm">
				J
			</div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest text-zinc-900">
				Admin Portal
			</h1>
			<p class="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
				Sign in to manage your e-commerce store
			</p>
		</div>

		<!-- Card -->
		<div class="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8 md:p-10">
			{#if form?.error}
				<div
					role="alert"
					class="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium mb-6"
				>
					<span class="material-symbols-outlined text-base shrink-0">error</span>
					<span>{form.error}</span>
				</div>
			{/if}

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
				class="flex flex-col gap-5"
			>
				<div>
					<label for="admin-email" class="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
						Email Address
					</label>
					<div class="relative">
						<input
							id="admin-email"
							name="email"
							type="email"
							required
							autocomplete="username"
							placeholder="admin@example.com"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
						/>
					</div>
				</div>

				<div>
					<label for="admin-password" class="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
						Password
					</label>
					<div class="relative">
						<input
							id="admin-password"
							name="password"
							type="password"
							required
							autocomplete="current-password"
							placeholder="••••••••"
							class="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-xs transition-colors"
						/>
					</div>
				</div>

				<input type="hidden" name="redirect" value={data.redirectTo} />

				<button
					type="submit"
					disabled={loading}
					class="w-full bg-zinc-900 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-2"
				>
					{#if loading}
						<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
						Signing In...
					{:else}
						Sign In to Dashboard
					{/if}
				</button>
			</form>
		</div>

		<!-- Back link -->
		<div class="text-center mt-6">
			<a
				href="/"
				class="text-xs text-zinc-500 hover:text-zinc-900 uppercase tracking-wider font-semibold inline-flex items-center gap-1 transition-colors"
			>
				<span class="material-symbols-outlined text-sm">arrow_back</span>
				Back to Storefront
			</a>
		</div>
	</div>
</div>
