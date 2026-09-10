<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		LayoutDashboard,
		Boxes,
		ReceiptText,
		Tag,
		KeyRound,
		DatabaseBackup,
		ScrollText,
		Newspaper,
		Users,
		Settings,
		X,
		Menu,
		ExternalLink,
		PanelLeftClose,
		PanelLeftOpen
	} from 'lucide-svelte';
	import { AdminLogo, UiIcon } from '$shared/ui';

	let { children }: { children: import('svelte').Snippet } = $props();

	const nav = [
		{ href: '/admin', label: '仪表盘', icon: LayoutDashboard },
		{ href: '/admin/products', label: '商品', icon: Boxes },
		{ href: '/admin/orders', label: '订单', icon: ReceiptText },
		{ href: '/admin/coupons', label: '优惠券', icon: Tag },
		{ href: '/admin/customers', label: '客户', icon: Users },
		{ href: '/admin/content', label: '内容', icon: Newspaper },
		{ href: '/admin/auth', label: '认证', icon: KeyRound },
		{ href: '/admin/backups', label: '备份', icon: DatabaseBackup },
		{ href: '/admin/logs', label: '日志', icon: ScrollText },
		{ href: '/admin/settings', label: '设置', icon: Settings }
	];

	let drawerOpen = $state(false);
	let isCollapsed = $state(false);
	const isLogin = $derived($page.url.pathname.startsWith('/admin/login'));

	onMount(() => {
		try {
			const saved = localStorage.getItem('admin_sidebar_collapsed');
			if (saved !== null) {
				isCollapsed = saved === 'true';
			}
		} catch {
			// ignore
		}
	});

	function toggleCollapsed() {
		isCollapsed = !isCollapsed;
		try {
			localStorage.setItem('admin_sidebar_collapsed', String(isCollapsed));
		} catch {
			// ignore
		}
	}

	function isActive(href: string): boolean {
		const pathname = $page.url.pathname;
		return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
	}
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
				class="fixed lg:sticky top-0 z-50 lg:z-10 shrink-0 h-screen border-r border-zinc-200 bg-zinc-50 flex flex-col justify-between transition-all duration-200 py-6 {isCollapsed
					? 'w-64 px-5 lg:w-20 lg:px-3'
					: 'w-64 px-5'} {drawerOpen
					? 'translate-x-0 shadow-xl'
					: '-translate-x-full lg:translate-x-0'}"
			>
				<div class="flex flex-col gap-6 overflow-y-auto min-h-0 flex-1">
					<!-- Brand logo -->
					<div class="flex items-center {isCollapsed ? 'lg:justify-center' : 'justify-between'} px-1">
						<a href="/admin" class="flex items-center gap-2.5 min-w-0" title="管理后台首页">
							<AdminLogo class="w-8 h-8 shrink-0" iconSize={16} />
							<div class="min-w-0 {isCollapsed ? 'lg:hidden' : ''}">
								<h1 class="text-xs font-bold uppercase tracking-[0.25em] text-zinc-900 truncate">JEVARIE</h1>
								<p class="text-[9px] uppercase tracking-[0.15em] text-zinc-400 font-semibold truncate">
									店铺管理
								</p>
							</div>
						</a>
						<a
							href="/"
							target="_blank"
							title="查看线上店铺"
							class="text-zinc-400 hover:text-zinc-800 p-1.5 rounded-md hover:bg-zinc-100 transition-colors {isCollapsed
								? 'lg:hidden'
								: ''}"
						>
							<UiIcon icon={ExternalLink} size={16} />
						</a>
					</div>

					<div class="h-px bg-zinc-100"></div>

					<!-- Navigation links -->
					<nav class="flex flex-col gap-1">
						{#if !isCollapsed}
							<p class="px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mb-1">
								导航
							</p>
						{/if}
						{#each nav as item (item.href)}
							{@const active = isActive(item.href)}
							{@const NavIcon = item.icon}
							<a
								href={item.href}
								onclick={() => (drawerOpen = false)}
								title={isCollapsed ? item.label : undefined}
								class="flex items-center rounded-lg text-xs font-semibold tracking-wider uppercase transition-all {isCollapsed
									? 'lg:justify-center lg:p-2.5 px-3.5 py-2.5 gap-3'
									: 'gap-3 px-3.5 py-2.5'} {active
									? 'bg-zinc-900 text-white shadow-xs'
									: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'}"
							>
								<UiIcon
									icon={NavIcon}
									size={18}
									class={active ? 'text-white' : 'text-zinc-400 shrink-0'}
								/>
								<span class={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
							</a>
						{/each}
					</nav>
				</div>

				<!-- Sidebar Footer: Collapse Toggle -->
				<div class="pt-3 border-t border-zinc-200/80 shrink-0 hidden lg:block">
					{#if isCollapsed}
						<div class="flex justify-center">
							<button
								type="button"
								onclick={toggleCollapsed}
								class="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all cursor-pointer"
								aria-label="展开侧边栏"
								title="展开侧边栏"
							>
								<UiIcon icon={PanelLeftOpen} size={18} class="text-zinc-500" />
							</button>
						</div>
					{:else}
						<button
							type="button"
							onclick={toggleCollapsed}
							class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all cursor-pointer"
							aria-label="折叠侧边栏"
							title="折叠侧边栏"
						>
							<UiIcon icon={PanelLeftClose} size={18} class="text-zinc-400 shrink-0" />
							<span>折叠侧边栏</span>
						</button>
					{/if}
				</div>
			</aside>

			<!-- Content Area -->
			<main class="flex-1 min-w-0 px-6 md:px-10 py-8 max-w-7xl mx-auto w-full">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
