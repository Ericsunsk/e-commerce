<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
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

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

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

	const userInitials = $derived(
		data.adminEmail ? data.adminEmail.slice(0, 2).toUpperCase() : 'AD'
	);
</script>

<svelte:head>
	<title>管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if isLogin}
	{@render children()}
{:else}
	<div class="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased flex flex-col">
		<!-- Global Top Bar (顶部栏) -->
		<header
			class="sticky top-0 z-40 h-14 bg-zinc-50 border-b border-zinc-200 px-4 lg:px-6 flex items-center justify-between"
		>
			<div class="flex items-center gap-3 min-w-0">
				<button
					onclick={() => (drawerOpen = !drawerOpen)}
					aria-label="切换导航菜单"
					class="lg:hidden p-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
				>
					{#if drawerOpen}
						<UiIcon icon={X} size={18} />
					{:else}
						<UiIcon icon={Menu} size={18} />
					{/if}
				</button>
				<a
					href="/admin"
					class="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity"
					title={data.siteName ? `${data.siteName} - 管理后台` : '管理后台'}
				>
					<AdminLogo
						src={data.logoUrl}
						label={data.siteName}
						class="w-8 h-8 shrink-0"
						iconSize={16}
					/>
					<span class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 truncate">
						{data.siteName || 'JEVARIE'}
					</span>
				</a>
			</div>

			<div class="flex items-center gap-3 shrink-0">
				<a
					href="/"
					target="_blank"
					title="查看线上店铺"
					class="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors hidden sm:flex items-center"
					aria-label="查看线上店铺"
				>
					<UiIcon icon={ExternalLink} size={16} />
				</a>
				{#if data.adminEmail}
					<div class="h-4 w-px bg-zinc-200 hidden sm:block"></div>
					<div class="flex items-center gap-2" title={data.adminEmail}>
						<div
							class="w-7 h-7 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center font-mono shrink-0"
						>
							{userInitials}
						</div>
						<span
							class="text-xs font-mono font-medium text-zinc-600 hidden md:inline-block truncate max-w-[200px]"
						>
							{data.adminEmail}
						</span>
					</div>
				{/if}
			</div>
		</header>

		<!-- Main Layout with Divider below Top Bar -->
		<div class="flex flex-1 min-h-[calc(100vh-3.5rem)]">
			<!-- Mobile drawer backdrop -->
			{#if drawerOpen}
				<button
					onclick={() => (drawerOpen = false)}
					aria-label="关闭菜单"
					class="fixed inset-0 top-14 z-40 bg-zinc-900/30 backdrop-blur-xs lg:hidden cursor-default"
				></button>
			{/if}

			<!-- Sidebar (导航栏) -->
			<aside
				class="fixed lg:sticky top-14 z-40 lg:z-10 shrink-0 h-[calc(100vh-3.5rem)] border-r border-zinc-200 bg-zinc-50 flex flex-col justify-between transition-all duration-200 py-4 {isCollapsed
					? 'w-64 px-4 lg:w-20 lg:px-3'
					: 'w-64 px-4'} {drawerOpen
					? 'translate-x-0 shadow-xl'
					: '-translate-x-full lg:translate-x-0'}"
			>
				<!-- Navigation links -->
				<nav class="flex flex-col gap-1 overflow-y-auto min-h-0 flex-1">
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
