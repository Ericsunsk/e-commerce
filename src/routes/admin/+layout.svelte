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
</script>

<svelte:head>
	<title>Admin Portal</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if isLogin}
	{@render children()}
{:else}
	<div class="min-h-screen bg-neutral-950 text-white">
	<!-- Mobile top bar -->
	<header class="lg:hidden flex items-center justify-between px-6 py-4 border-b border-white/10">
		<span class="text-xs uppercase tracking-[0.3em] text-white/60">Admin</span>
		<button
			onclick={() => (drawerOpen = !drawerOpen)}
			aria-label="Toggle navigation"
			class="p-2 border border-white/20"
		>
			<span class="material-symbols-outlined">{drawerOpen ? 'close' : 'menu'}</span>
		</button>
	</header>

	<div class="flex">
		<!-- Sidebar -->
		<aside
			class="fixed lg:static z-40 w-64 shrink-0 min-h-screen border-r border-white/10 bg-neutral-950 px-6 py-8 flex-col gap-8 {drawerOpen
				? 'flex'
				: 'hidden'} lg:flex"
		>
			<div>
				<p class="text-[10px] uppercase tracking-[0.3em] text-white/40">Store Admin</p>
				<p class="text-xs text-white/60 mt-1 truncate">{data.adminEmail}</p>
			</div>

			<nav class="flex flex-col gap-1">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						onclick={() => (drawerOpen = false)}
						class="flex items-center gap-3 px-3 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors {isActive(
							item.href
						)
							? 'bg-white text-black'
							: 'text-white/60 hover:text-white hover:bg-white/5'}"
					>
						<span class="material-symbols-outlined text-lg">{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</nav>

			<form method="POST" action="/admin/logout" class="mt-auto">
				<button
					type="submit"
					class="w-full flex items-center gap-3 px-3 py-3 text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/5"
				>
					<span class="material-symbols-outlined text-lg">logout</span>
					Logout
				</button>
			</form>
		</aside>

		<!-- Content -->
		<main class="flex-1 min-w-0 px-6 md:px-10 py-8">
			{@render children()}
		</main>
	</div>
</div>
{/if}
