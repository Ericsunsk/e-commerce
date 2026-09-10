<script lang="ts">
	import { page } from '$app/stores';
	import {
		LayoutDashboard,
		Boxes,
		ReceiptText,
		Tag,
		Settings,
		X,
		Menu,
		ExternalLink,
		LogOut
	} from 'lucide-svelte';
	import { AdminLogo, UiIcon } from '$shared/ui';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const nav = [
		{ href: '/admin', label: '仪表盘', icon: LayoutDashboard },
		{ href: '/admin/products', label: '商品', icon: Boxes },
		{ href: '/admin/orders', label: '订单', icon: ReceiptText },
		{ href: '/admin/coupons', label: '优惠券', icon: Tag },
		{ href: '/admin/settings', label: '设置', icon: Settings }
	];

	let drawerOpen = $state(false);
	const isLogin = $derived($page.url.pathname.startsWith('/admin/login'));

	function isActive(href: string): boolean {
		const pathname = $page.url.pathname;
		return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
	}

	const userInitials = $derived(data.adminEmail ? data.adminEmail.slice(0, 2).toUpperCase() : 'AD');
</script>

<svelte:head>
	<title>管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if isLogin}
	{@render children()}
{:else}
	<div class="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased flex flex-col">
		<!-- Mobile top bar -->
		<header
			class="lg:hidden flex items-center justify-between px-5 py-3.5 bg-zinc-50 sticky top-0 z-30"
		>
			<div class="flex items-center gap-2.5">
				<AdminLogo class="w-7 h-7" iconSize={14} />
				<span class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-900">Admin</span>
			</div>
			<button
				onclick={() => (drawerOpen = !drawerOpen)}
				aria-label="切换导航菜单"
				class="p-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors"
			>
				{#if drawerOpen}
					<UiIcon icon={X} size={20} />
				{:else}
					<UiIcon icon={Menu} size={20} />
				{/if}
			</button>
		</header>

		<div class="flex flex-1">
			<!-- Mobile drawer backdrop -->
			{#if drawerOpen}
				<button
					onclick={() => (drawerOpen = false)}
					aria-label="关闭菜单"
					class="fixed inset-0 z-40 bg-zinc-900/30 backdrop-blur-xs lg:hidden cursor-default"
				></button>
			{/if}

			<!-- Sidebar -->
			<aside
				class="fixed lg:sticky top-0 z-50 lg:z-10 w-64 shrink-0 h-screen border-r border-zinc-200 bg-zinc-50 px-5 py-6 flex flex-col justify-between transition-transform duration-200 {drawerOpen
					? 'translate-x-0 shadow-xl'
					: '-translate-x-full lg:translate-x-0'}"
			>
				<div class="flex flex-col gap-6">
					<!-- Brand logo -->
					<div class="flex items-center justify-between px-1">
						<div class="flex items-center gap-2.5">
							<AdminLogo class="w-8 h-8" iconSize={16} />
							<div>
								<h1 class="text-xs font-bold uppercase tracking-[0.25em] text-zinc-900">JEVARIE</h1>
								<p class="text-[9px] uppercase tracking-[0.15em] text-zinc-400 font-semibold">
									店铺管理
								</p>
							</div>
						</div>
						<a
							href="/"
							target="_blank"
							title="查看线上店铺"
							class="text-zinc-400 hover:text-zinc-800 p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
						>
							<UiIcon icon={ExternalLink} size={16} />
						</a>
					</div>

					<div class="h-px bg-zinc-100"></div>

					<!-- Navigation links -->
					<nav class="flex flex-col gap-1">
						<p class="px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-1">
							导航
						</p>
						{#each nav as item (item.href)}
							{@const active = isActive(item.href)}
							{@const NavIcon = item.icon}
							<a
								href={item.href}
								onclick={() => (drawerOpen = false)}
								class="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all {active
									? 'bg-zinc-900 text-white shadow-xs'
									: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'}"
							>
								<UiIcon icon={NavIcon} size={18} class={active ? 'text-white' : 'text-zinc-400'} />
								{item.label}
							</a>
						{/each}
					</nav>
				</div>

				<!-- User profile & Logout -->
				<div class="flex flex-col gap-3 pt-4 border-t border-zinc-100">
					<div class="flex items-center gap-3 px-2 py-1">
						<div
							class="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center text-[11px] font-bold shrink-0"
						>
							{userInitials}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-[10px] uppercase font-bold tracking-wider text-zinc-400">超级管理员</p>
							<p class="text-xs font-semibold text-zinc-800 truncate" title={data.adminEmail || ''}>
								{data.adminEmail || '管理员'}
							</p>
						</div>
					</div>

					<form method="POST" action="/admin/logout">
						<button
							type="submit"
							class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
						>
							<UiIcon icon={LogOut} size={16} />
							退出登录
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
