<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const nav = [
		{ href: '/admin', label: 'Dashboard', icon: 'dashboard' },
		{ href: '/admin/products', label: 'Products', icon: 'inventory_2' },
		{ href: '/admin/orders', label: 'Orders', icon: 'receipt_long' },
		{ href: '/admin/coupons', label: 'Coupons', icon: 'sell' },
		{ href: '/admin/settings', label: 'Settings', icon: 'settings' }
	];

	let drawerOpen = $state(false);
	const isLogin = $derived($page.url.pathname.startsWith('/admin/login'));

	function isActive(href: string): boolean {
		const pathname = $page.url.pathname;
		return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
	}

	const userInitials = $derived(
		data.adminEmail ? data.adminEmail.slice(0, 2).toUpperCase() : 'AD'
	);
</script>

<svelte:head>
	<title>Admin Portal</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if isLogin}
	{@render children()}
{:else}
	<div class="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased flex flex-col">
		<!-- Mobile top bar -->
		<header class="lg:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-zinc-200 sticky top-0 z-30 shadow-xs">
			<div class="flex items-center gap-2.5">
				<div class="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
					J
				</div>
				<span class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-900">Admin</span>
			</div>
			<button
				onclick={() => (drawerOpen = !drawerOpen)}
				aria-label="Toggle navigation"
				class="p-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors"
			>
				<span class="material-symbols-outlined text-xl">{drawerOpen ? 'close' : 'menu'}</span>
			</button>
		</header>

		<div class="flex flex-1">
			<!-- Mobile drawer backdrop -->
			{#if drawerOpen}
				<button
					onclick={() => (drawerOpen = false)}
					aria-label="Close menu"
					class="fixed inset-0 z-40 bg-zinc-900/30 backdrop-blur-xs lg:hidden cursor-default"
				></button>
			{/if}

			<!-- Sidebar -->
			<aside
				class="fixed lg:sticky top-0 z-50 lg:z-10 w-64 shrink-0 h-screen border-r border-zinc-200 bg-white px-5 py-6 flex flex-col justify-between transition-transform duration-200 {drawerOpen
					? 'translate-x-0 shadow-xl'
					: '-translate-x-full lg:translate-x-0'}"
			>
				<div class="flex flex-col gap-6">
					<!-- Brand logo -->
					<div class="flex items-center justify-between px-1">
						<div class="flex items-center gap-2.5">
							<div class="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
								J
							</div>
							<div>
								<h1 class="text-xs font-bold uppercase tracking-[0.25em] text-zinc-900">JEVARIE</h1>
								<p class="text-[9px] uppercase tracking-[0.15em] text-zinc-400 font-semibold">Store Management</p>
							</div>
						</div>
						<a
							href="/"
							target="_blank"
							title="View live storefront"
							class="text-zinc-400 hover:text-zinc-800 p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
						>
							<span class="material-symbols-outlined text-base">open_in_new</span>
						</a>
					</div>

					<div class="h-px bg-zinc-100"></div>

					<!-- Navigation links -->
					<nav class="flex flex-col gap-1">
						<p class="px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-1">Navigation</p>
						{#each nav as item (item.href)}
							{@const active = isActive(item.href)}
							<a
								href={item.href}
								onclick={() => (drawerOpen = false)}
								class="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all {active
									? 'bg-zinc-900 text-white shadow-xs'
									: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'}"
							>
								<span class="material-symbols-outlined text-lg {active ? 'text-white' : 'text-zinc-400'}">{item.icon}</span>
								{item.label}
							</a>
						{/each}
					</nav>
				</div>

				<!-- User profile & Logout -->
				<div class="flex flex-col gap-3 pt-4 border-t border-zinc-100">
					<div class="flex items-center gap-3 px-2 py-1">
						<div class="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center text-[11px] font-bold shrink-0">
							{userInitials}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Superuser</p>
							<p class="text-xs font-semibold text-zinc-800 truncate" title={data.adminEmail || ''}>
								{data.adminEmail || 'Administrator'}
							</p>
						</div>
					</div>

					<form method="POST" action="/admin/logout">
						<button
							type="submit"
							class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-base">logout</span>
							Sign Out
						</button>
					</form>
				</div>
			</aside>

			<!-- Content Area -->
			<main class="flex-1 min-w-0 px-6 md:px-10 py-8 max-w-7xl mx-auto w-full">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
