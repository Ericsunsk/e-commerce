<script lang="ts">
	import { page } from '$app/stores';
	import { useCart } from '$lib/stores/cart.svelte';
	import { goto } from '$app/navigation';
	import { DEFAULTS } from '$lib/constants';
	import { isLinkActive } from '$lib/utils/core';
	import HeaderSearch from './header/HeaderSearch.svelte';

	const cart = useCart();

	import type { NavItem } from '$lib/types';

	interface HeaderProps {
		variant?: 'transparent' | 'solid';
		navItems?: NavItem[];
		onCartClick?: () => void;
		onMenuClick?: () => void;
		siteName?: string;
		isMenuOpen?: boolean;
	}

	let {
		variant = undefined,
		navItems = [],
		onCartClick,
		onMenuClick,
		siteName = DEFAULTS.siteName,
		isMenuOpen = false
	}: HeaderProps = $props();

	// Reactive state
	// isMobileMenuOpen removed - controlled by parent
	let isSearchOpen = $state(false);
	let isScrolled = $state(false);
	let isVisible = $state(true);
	let lastScrollY = $state(0);
	let searchQuery = $state('');

	function handleSearch(e: Event) {
		e.preventDefault();
		if (searchQuery.trim()) {
			goto(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
			isSearchOpen = false;
		}
	}

	let isWishlistPage = $derived($page.url.pathname === '/wishlist');
	let isAccountPage = $derived($page.url.pathname === '/account');
	let isCollectionPage = $derived($page.url.pathname === '/collection');
	let isHomePage = $derived($page.url.pathname === '/');

	// Check if the current page starts with a Hero section
	let hasHeroAtTop = $derived.by(() => {
		const sections = $page.data.sections || [];
		if (sections.length === 0) return false;

		const firstSection = [...sections]
			.filter((s) => s.isActive !== false)
			.sort((a, b) => a.sortOrder - b.sortOrder)[0];

		return firstSection?.type === 'hero';
	});

	let isDarkHeroPage = $derived(isHomePage || isCollectionPage || hasHeroAtTop);

	let effectiveVariant = $derived(variant ?? (isAccountPage ? 'solid' : 'transparent'));

	function toggleMenu() {
		onMenuClick?.();
	}

	function toggleSearch() {
		isSearchOpen = !isSearchOpen;
		if (isSearchOpen && isMenuOpen) {
			onMenuClick?.(); // Close menu if search opens
		}
	}

	let ticking = false;

	function handleScroll() {
		if (!ticking) {
			window.requestAnimationFrame(() => {
				const currentScrollY = window.scrollY;
				isScrolled = currentScrollY > 20;

				if (currentScrollY > 100) {
					isVisible = currentScrollY < lastScrollY || currentScrollY <= 0;
				} else {
					isVisible = true;
				}

				lastScrollY = currentScrollY;
				ticking = false;
			});
			ticking = true;
		}
	}

	let headerContextClass = $derived.by(() => {
		const commonBorder = 'border-b';
		const transitionClass = 'transition-all duration-500 ease-in-out';

		if (isSearchOpen) {
			return `${commonBorder} ${transitionClass} bg-background-light dark:bg-background-dark text-primary dark:text-white border-transparent h-[140px]`;
		}

		if (effectiveVariant === 'solid' || isScrolled || isMenuOpen) {
			const base = `${commonBorder} ${transitionClass} bg-background-light dark:bg-background-dark text-primary dark:text-white`;
			return isScrolled
				? `${base} border-primary/10 dark:border-white/10`
				: `${base} border-transparent`;
		}

		const textColor = isDarkHeroPage
			? 'text-white'
			: 'text-primary dark:text-white underline-offset-4';
		return `${commonBorder} ${transitionClass} bg-transparent ${textColor} border-transparent`;
	});

	function checkLinkActive(linkHref: string) {
		return isLinkActive(linkHref, $page.url.pathname, $page.url.search);
	}
</script>

<svelte:window onscroll={handleScroll} />

<header
	class="fixed top-0 left-0 w-full z-[var(--z-header)] transition-all duration-500 ease-in-out {headerContextClass} {isVisible
		? 'translate-y-0'
		: '-translate-y-full'}"
>
	<!-- Overlay Backdrop for Content Focus -->
	{#if isSearchOpen}
		<div
			class="absolute inset-0 top-full h-screen bg-black/20 backdrop-blur-sm transition-all duration-500"
			onclick={toggleSearch}
			onkeydown={(e) => e.key === 'Escape' && toggleSearch()}
			role="button"
			tabindex="-1"
			aria-label="Close search overlay"
		></div>
	{/if}

	<div
		class="max-w-[1600px] mx-auto px-6 md:px-12 h-[var(--header-height)] flex items-center justify-between relative"
	>
		<!-- Desktop Nav -->
		<div
			class="hidden md:flex items-center gap-8 text-[10px] font-sans uppercase tracking-[0.15em]"
		>
			{#each navItems as link (link.url)}
				<a
					href={link.url}
					data-sveltekit-preload-data="hover"
					class="border-b pb-1 {checkLinkActive(link.url)
						? 'border-current'
						: 'border-transparent hover:border-current'}"
				>
					{link.label}
				</a>
			{/each}
		</div>

		<!-- Mobile Menu Button -->
		<button
			onclick={toggleMenu}
			aria-label="Toggle menu"
			class="md:hidden p-2 -ml-2 hover:opacity-70 transition-opacity outline-none focus:outline-none active:outline-none tap-highlight-transparent"
		>
			<span class="material-symbols-outlined text-[24px]">
				{isMenuOpen ? 'close' : 'menu'}
			</span>
		</button>

		<!-- Logo -->
		<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
			<a
				href="/"
				class="text-xl md:text-2xl font-bold tracking-[0.05em] uppercase whitespace-nowrap font-display"
			>
				{siteName}
			</a>
		</div>

		<!-- Right Actions -->
		<div
			class="hidden md:flex items-center gap-8 text-[10px] font-sans uppercase tracking-[0.15em]"
		>
			<a
				href="/wishlist"
				data-sveltekit-preload-data="hover"
				class="border-b pb-1 {isWishlistPage && !isSearchOpen
					? 'border-current'
					: 'border-transparent hover:border-current'}"
			>
				Wishlist
			</a>
			<button
				onclick={toggleSearch}
				class="appearance-none bg-transparent border-b border-solid pb-1 cursor-pointer {isSearchOpen
					? 'border-current'
					: 'border-transparent hover:border-current'}"
			>
				SEARCH
			</button>
			<a
				href="/account"
				data-sveltekit-preload-data="hover"
				class="border-b pb-1 {isAccountPage && !isSearchOpen
					? 'border-current'
					: 'border-transparent hover:border-current'}"
			>
				Account
			</a>
			<button
				onclick={onCartClick}
				class="appearance-none bg-transparent border-b border-solid pb-1 cursor-pointer border-transparent hover:border-current"
			>
				BAG ({cart.count})
			</button>
		</div>
	</div>

	<!-- Mobile Menu removed from here, lifted to Layout -->

	<!-- Search Input (extracted component) -->
	{#if isSearchOpen}
		<HeaderSearch bind:searchQuery onSubmit={handleSearch} />
	{/if}
</header>
