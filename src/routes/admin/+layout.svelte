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
</script>

<svelte:head>
	<title>管理后台</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if isLogin}
	{@render children()}
{:else}
	<div class="min-h-screen bg-zinc-50/50 text-zinc-900 font-sans antialiased flex">
		<!-- Mobile drawer backdrop -->
		{#if drawerOpen}
			<button
				onclick={() => (drawerOpen = false)}
				aria-label="关闭菜单"
				class="fixed inset-0 z-40 bg-zinc-900/30 backdrop-blur-xs lg:hidden cursor-default"
			></button>
		{/if}

		<!-- Left Column: Sidebar (垂直贯穿到底，包含顶部 Logo 栏 + 导航链接 + 底部折叠切换) -->
		<aside
			class="fixed lg:sticky top-0 z-50 lg:z-30 shrink-0 h-screen border-r border-zinc-200 bg-white flex flex-col justify-between transition-all duration-200 {isCollapsed
				? 'w-64 lg:w-14'
				: 'w-64'} {drawerOpen
				? 'translate-x-0 shadow-xl'
				: '-translate-x-full lg:translate-x-0'}"
		>
			<div class="flex flex-col min-h-0 flex-1">
				<!-- Sidebar Top Brand Box (与右侧顶部栏等高 h-14，底部有横向分割线 border-b) -->
				<div
					class="h-14 shrink-0 border-b border-zinc-200 flex items-center {isCollapsed
						? 'lg:justify-center px-2'
						: 'px-4'} transition-all"
				>
					<a
						href="/admin"
						class="flex items-center {isCollapsed ? 'justify-center w-full' : 'gap-3'} min-w-0 group hover:opacity-85 transition-opacity"
						title={data.siteName ? `${data.siteName} - 管理后台` : '管理后台'}
					>
						<AdminLogo
							src={data.logoUrl}
							label={data.siteName}
							class="w-7 h-7 shrink-0"
							iconSize={16}
						/>
						<span
							class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 truncate {isCollapsed
								? 'lg:hidden'
								: ''}"
						>
							{data.siteName || 'JEVARIE'}
						</span>
					</a>
				</div>

				<!-- Navigation links -->
				<nav class="flex flex-col gap-1.5 p-2 overflow-y-auto min-h-0 flex-1">
					{#each nav as item (item.href)}
						{@const active = isActive(item.href)}
						{@const NavIcon = item.icon}
						<a
							href={item.href}
							onclick={() => (drawerOpen = false)}
							title={isCollapsed ? item.label : undefined}
							class="flex items-center rounded-xl text-xs tracking-wider uppercase transition-colors text-zinc-900 {isCollapsed
								? 'lg:w-10 lg:h-10 lg:p-0 lg:justify-center mx-auto px-3 py-2.5 gap-3'
								: 'gap-3 px-3 py-2.5'} {active
								? 'bg-zinc-100 font-semibold'
								: 'hover:bg-zinc-100/80 font-normal'}"
						>
							<UiIcon
								icon={NavIcon}
								size={18}
								class="text-zinc-900 shrink-0"
							/>
							<span class={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
						</a>
					{/each}
				</nav>
			</div>

			<!-- Sidebar Footer: Collapse Toggle -->
			<div
				class="h-14 shrink-0 border-t border-zinc-200 hidden lg:flex items-center {isCollapsed
					? 'justify-center'
					: 'px-3'}"
			>
				{#if isCollapsed}
					<button
						type="button"
						onclick={toggleCollapsed}
						class="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
						aria-label="展开侧边栏"
						title="展开侧边栏"
					>
						<UiIcon icon={PanelLeftOpen} size={18} class="text-zinc-900" />
					</button>
				{:else}
					<button
						type="button"
						onclick={toggleCollapsed}
						class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
						aria-label="折叠侧边栏"
						title="折叠侧边栏"
					>
						<UiIcon icon={PanelLeftClose} size={18} class="text-zinc-900 shrink-0" />
						<span>折叠侧边栏</span>
					</button>
				{/if}
			</div>
		</aside>

		<!-- Right Column: Top Bar + Main Content Area -->
		<div class="flex-1 min-w-0 flex flex-col min-h-screen">
			<!-- Right Top Bar (顶部栏：高 h-14，底部有横向分割线 border-b) -->
			<header
				class="sticky top-0 z-30 h-14 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between"
			>
				<div class="flex items-center gap-3">
					<!-- Mobile menu button -->
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

					<!-- Mobile Brand (shown only on mobile) -->
					<div class="lg:hidden flex items-center gap-2">
						<AdminLogo
							src={data.logoUrl}
							label={data.siteName}
							class="w-7 h-7 shrink-0"
							iconSize={14}
						/>
						<span class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 truncate">
							{data.siteName || 'JEVARIE'}
						</span>
					</div>
				</div>

				<!-- Right profile -->
				{#if data.adminEmail}
					<div class="flex items-center shrink-0">
						<span
							class="text-xs font-mono font-medium text-zinc-600 truncate max-w-[240px]"
							title={data.adminEmail}
						>
							{data.adminEmail}
						</span>
					</div>
				{/if}
			</header>

			<!-- Main Content -->
			<main class="flex-1 min-w-0 px-6 md:px-10 py-8 max-w-7xl mx-auto w-full">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
