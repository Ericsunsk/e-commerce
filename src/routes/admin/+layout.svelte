<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	import {
		LayoutDashboard,
		Package,
		ReceiptText,
		Tag,
		KeyRound,
		Database,
		FileText,
		Newspaper,
		Users,
		Settings,
		X,
		Menu,
		PanelLeftClose,
		PanelLeftOpen
	} from 'lucide-svelte';
	import { AdminLogo, UiIcon } from '$shared/ui';
	import { ICONS } from '$shared/kernel';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const nav = [
		{ href: '/admin', label: '仪表盘', icon: LayoutDashboard },
		{ href: '/admin/products', label: '商品', icon: Package },
		{ href: '/admin/orders', label: '订单', icon: ReceiptText },
		{ href: '/admin/coupons', label: '优惠券', icon: Tag },
		{ href: '/admin/customers', label: '客户', icon: Users },
		{ href: '/admin/content', label: '内容', icon: Newspaper },
		{ href: '/admin/auth', label: '认证', icon: KeyRound },
		{ href: '/admin/backups', label: '备份', icon: Database },
		{ href: '/admin/logs', label: '日志', icon: FileText },
		{ href: '/admin/settings', label: '设置', icon: Settings }
	];

	let drawerOpen = $state(false);
	let isCollapsed = $state(false);
	let isHovered = $state(false);
	const effectiveCollapsed = $derived(isCollapsed && !isHovered);
	const isLogin = $derived($page.url.pathname.startsWith('/admin/login'));

	let showStickyTitle = $state(false);
	let dynamicTitle = $state('');

	const currentNav = $derived.by(() => {
		const pathname = $page.url.pathname;
		if (pathname === '/admin') return nav[0];
		return (
			nav
				.slice(1)
				.filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
				.sort((a, b) => b.href.length - a.href.length)[0] || nav[0]
		);
	});

	function updateStickyTitle() {
		if (typeof window === 'undefined') return;
		if (window.scrollY <= 10) {
			showStickyTitle = false;
			return;
		}
		const heading = document.querySelector('main h1');
		if (!heading) {
			showStickyTitle = false;
			return;
		}
		const rect = heading.getBoundingClientRect();
		// 顶栏高 56px (h-14)。当页面主标题向上滚动触碰顶栏下沿 (rect.top <= 56) 时自动出现在顶栏靠左位置
		showStickyTitle = rect.top <= 56;
		const text = heading.textContent?.replace(/\s+/g, ' ').trim();
		if (text) {
			dynamicTitle = text;
		}
	}

	function updateHeadingText() {
		if (typeof document === 'undefined') return;
		const heading = document.querySelector('main h1');
		if (heading?.textContent) {
			const text = heading.textContent.replace(/\s+/g, ' ').trim();
			if (text) dynamicTitle = text;
		}
	}

	$effect(() => {
		const _ = $page.url.pathname;
		showStickyTitle = false;
		requestAnimationFrame(() => {
			updateHeadingText();
			updateStickyTitle();
		});
	});

	onMount(() => {
		try {
			const saved = localStorage.getItem('admin_sidebar_collapsed');
			if (saved !== null) {
				isCollapsed = saved === 'true';
			}
		} catch {
			// ignore
		}

		let ticking = false;
		const onScroll = () => {
			if (!ticking) {
				requestAnimationFrame(() => {
					updateStickyTitle();
					ticking = false;
				});
				ticking = true;
			}
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });

		updateHeadingText();
		updateStickyTitle();

		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
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

		<!-- Desktop Spacer: 保持主内容区宽度稳定，折叠态 hover 时以悬浮浮层展开，避免主页面重排抖动 -->
		<div
			class="hidden lg:block shrink-0 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] {isCollapsed
				? 'w-14'
				: 'w-52'}"
		></div>

		<!-- Left Column: Sidebar (垂直贯穿到底，包含顶部 Logo 栏 + 导航链接 + 底部折叠切换) -->
		<aside
			onmouseenter={() => (isHovered = true)}
			onmouseleave={() => (isHovered = false)}
			class="fixed top-0 left-0 z-50 lg:z-30 shrink-0 h-screen border-r border-zinc-200 bg-white flex flex-col justify-between overflow-hidden transition-[width,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] {effectiveCollapsed
				? 'w-52 lg:w-14'
				: 'w-52'} {isCollapsed && isHovered
				? 'lg:z-40'
				: ''} {drawerOpen
				? 'translate-x-0 shadow-xl'
				: '-translate-x-full lg:translate-x-0'}"
		>
			<div class="flex flex-col min-h-0 flex-1">
				<!-- Sidebar Top Brand Box (与右侧顶部栏等高 h-14，底部有横向分割线 border-b) -->
				<div class="h-14 shrink-0 border-b border-zinc-200 flex items-center px-2">
					<a
						href="/admin"
						class="flex items-center w-full h-10 rounded-xl min-w-0 group hover:opacity-85 transition-opacity whitespace-nowrap overflow-hidden"
						title={data.siteName ? `${data.siteName} - 管理后台` : '管理后台'}
					>
						<div class="w-10 h-10 shrink-0 flex items-center justify-center">
							<AdminLogo
								src={data.logoUrl}
								label={data.siteName}
								class="w-7 h-7"
								iconSize={16}
							/>
						</div>
						<span
							class="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900 shrink-0 pl-1 transition-opacity {effectiveCollapsed
								? 'opacity-0 duration-100 delay-0 pointer-events-none'
								: 'opacity-100 duration-150 delay-75'}"
						>
							{data.siteName || 'JEVARIE'}
						</span>
					</a>
				</div>

				<!-- Navigation links -->
				<nav class="flex flex-col gap-1.5 p-2 overflow-x-hidden overflow-y-auto min-h-0 flex-1">
					{#each nav as item (item.href)}
						{@const active = isActive(item.href)}
						{@const NavIcon = item.icon}
						<a
							href={item.href}
							onclick={() => {
								drawerOpen = false;
							}}
							title={effectiveCollapsed ? item.label : undefined}
							class="flex items-center h-10 w-full rounded-xl text-sm font-medium tracking-wider uppercase transition-colors duration-150 text-zinc-900 whitespace-nowrap overflow-hidden {active
								? 'bg-zinc-100'
								: 'hover:bg-zinc-100'}"
						>
							<div class="w-10 h-10 shrink-0 flex items-center justify-center">
								<UiIcon
									icon={NavIcon}
									size={ICONS.sizeNav}
									strokeWidth={ICONS.strokeWidth}
									class={ICONS.navClass}
								/>
							</div>
							<span
								class="text-zinc-900 shrink-0 pl-1 transition-opacity {effectiveCollapsed
									? 'opacity-0 duration-100 delay-0 pointer-events-none'
									: 'opacity-100 duration-150 delay-75'}"
							>
								{item.label}
							</span>
						</a>
					{/each}
				</nav>
			</div>

			<!-- Sidebar Footer: Collapse Toggle -->
			<div class="h-14 shrink-0 border-t border-zinc-200 hidden lg:flex items-center px-2">
				<button
					type="button"
					onclick={toggleCollapsed}
					class="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-900 hover:bg-zinc-100 transition-[background-color] duration-150 cursor-pointer"
					aria-label={isCollapsed ? '展开并固定侧边栏' : '折叠侧边栏'}
					title={isCollapsed ? '展开并固定侧边栏' : '折叠侧边栏'}
				>
					<UiIcon
						icon={isCollapsed ? PanelLeftOpen : PanelLeftClose}
						size={ICONS.sizeNav}
						strokeWidth={ICONS.strokeWidth}
						class={ICONS.navClass}
					/>
				</button>
			</div>
		</aside>

		<!-- Right Column: Top Bar + Main Content Area -->
		<div class="flex-1 min-w-0 flex flex-col min-h-screen">
			<!-- Right Top Bar (顶部栏：高 h-14，底部有横向分割线 border-b) -->
			<header
				class="sticky top-0 z-30 h-14 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between"
			>
				<div class="flex items-center gap-3 min-w-0">
					<!-- Mobile menu button -->
					<button
						onclick={() => (drawerOpen = !drawerOpen)}
						aria-label="切换导航菜单"
						class="lg:hidden p-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
					>
						{#if drawerOpen}
							<UiIcon icon={X} size={ICONS.sizeNav} strokeWidth={ICONS.strokeWidth} />
						{:else}
							<UiIcon icon={Menu} size={ICONS.sizeNav} strokeWidth={ICONS.strokeWidth} />
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
						<span class="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900 truncate">
							{data.siteName || 'JEVARIE'}
						</span>
					</div>

					<!-- Sticky Route Title (平时桌面端左侧完全空白；当页面向下滚动主标题触碰顶栏时，平滑淡入浮现) -->
					{#if currentNav}
						{@const CurrentIcon = currentNav.icon}
						<button
							type="button"
							onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
							class="hidden lg:flex items-center gap-2 min-w-0 text-left transition-all duration-200 ease-out cursor-pointer hover:opacity-80 {showStickyTitle
								? 'opacity-100 translate-y-0'
								: 'opacity-0 -translate-y-1 pointer-events-none'}"
							title="回到顶部"
						>
							<UiIcon
								icon={CurrentIcon}
								size={ICONS.sizeNav}
								strokeWidth={ICONS.strokeWidth}
								class="{ICONS.navClass} shrink-0"
							/>
							<span
								class="text-sm font-medium tracking-wider uppercase text-zinc-900 truncate"
							>
								{dynamicTitle || currentNav.label}
							</span>
						</button>
					{/if}
				</div>

				<!-- Right profile -->
				{#if data.adminEmail}
					<div class="flex items-center shrink-0">
						<span
							class="text-xs font-mono font-normal text-zinc-600 truncate max-w-[240px]"
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
