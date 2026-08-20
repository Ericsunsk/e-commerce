<script lang="ts">
	import type { NavItem } from '$lib/types';
	import { TRANSITIONS } from '$lib/constants';
	import { MESSAGES } from '$lib/messages';
	import { onMount } from 'svelte';

	interface FooterProps {
		navItems?: NavItem[];
		isHome?: boolean;
		siteSettings?: {
			siteName: string;
			// ... other settings if needed
		};
	}

	let { navItems = [], isHome = false }: FooterProps = $props();
	const COOKIE_SETTINGS_OPEN_EVENT = 'cookie-settings-open';
	const socialLinks = [
		{ label: 'Facebook', url: 'https://www.facebook.com/share/1D8tKGVced/?mibextid=wwXIfr' },
		{
			label: 'Instagram',
			url: 'https://www.instagram.com/essentials_1of?igsh=MXVnb3F5MWk1YXF1Zw%3D%3D&igsi=MXVnb3F5MWk1YXF1Zw%3D%3D&utm_source=qr'
		},
		{ label: 'Telegram', url: 'https://t.me/VANSFLOW' }
	];

	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let message = $state('');
	let isSocialOpen = $state(false);
	let isWhatsAppQrOpen = $state(false);
	let socialMenu: HTMLDivElement;

	onMount(() => {
		const closeSocialMenu = (event: MouseEvent) => {
			if (socialMenu && !socialMenu.contains(event.target as Node)) {
				isSocialOpen = false;
				isWhatsAppQrOpen = false;
			}
		};
		const closeSocialMenuOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				isSocialOpen = false;
				isWhatsAppQrOpen = false;
			}
		};

		document.addEventListener('click', closeSocialMenu);
		document.addEventListener('keydown', closeSocialMenuOnEscape);
		return () => {
			document.removeEventListener('click', closeSocialMenu);
			document.removeEventListener('keydown', closeSocialMenuOnEscape);
		};
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!email || !email.includes('@')) {
			status = 'error';
			message = MESSAGES.ERROR.PLEASE_ENTER_VALID_EMAIL;
			return;
		}

		status = 'loading';

		// 模拟 API 调用 - 实际项目中替换为真实的 newsletter API
		await new Promise((resolve) => setTimeout(resolve, 800));

		// 成功订阅
		status = 'success';
		message = MESSAGES.SUCCESS.SUBSCRIBED;
		email = '';

		// 3秒后重置状态
		setTimeout(() => {
			status = 'idle';
			message = '';
		}, 3000);
	}

	function openCookieSettings() {
		window.dispatchEvent(new Event(COOKIE_SETTINGS_OPEN_EVENT));
	}

	function toggleSocialMenu() {
		isSocialOpen = !isSocialOpen;
		if (isSocialOpen === false) isWhatsAppQrOpen = false;
	}
</script>

<footer
	class={`bg-white dark:bg-black text-primary dark:text-white ${isHome ? 'pt-20 pb-13' : 'py-13'} px-6 md:px-12 flex items-center justify-center`}
>
	<div
		class="w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-end gap-16 lg:gap-0"
	>
		<!-- Left: Newsletter -->
		<div class="w-full max-w-md">
			<h4 class="text-sm font-serif font-medium mb-0 tracking-wide text-primary dark:text-white">
				Join the Conversation
			</h4>
			<form class="relative border-none outline-none" onsubmit={handleSubmit}>
				<label for="newsletter-email" class="sr-only">Email Address</label>
				<input
					id="newsletter-email"
					type="email"
					placeholder="EMAIL ADDRESS"
					aria-label="Email Address"
					bind:value={email}
					disabled={status === 'loading'}
					class="w-full bg-transparent border-b border-primary dark:border-white py-3 pr-10 text-[10px] font-sans uppercase tracking-[0.15em] placeholder:text-primary/60 dark:placeholder:text-white/60 outline-none focus:outline-none focus:ring-0 focus:shadow-none focus:border-primary dark:focus:border-white disabled:opacity-50"
				/>
				<button
					type="submit"
					class="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-60 {TRANSITIONS.opacity} disabled:opacity-30"
					aria-label="Subscribe to newsletter"
					disabled={status === 'loading'}
				>
					{#if status === 'loading'}
						<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span
						>
					{:else}
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M1 12H23M23 12L19 8M23 12L19 16"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="square"
							/>
						</svg>
					{/if}
				</button>
				{#if message}
					<p
						class="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.15em] {status ===
						'success'
							? 'text-green-600 dark:text-green-400'
							: 'text-red-600 dark:text-red-400'} pointer-events-none whitespace-nowrap"
					>
						{message}
					</p>
				{/if}
			</form>
		</div>

		<!-- Right: Navigation and social links -->
		<div
			class="flex flex-wrap gap-x-8 gap-y-4 items-center justify-start lg:justify-end text-[10px] font-sans uppercase tracking-[0.15em] text-black"
		>
			{#each navItems as link (link.url)}
				<a href={link.url} class="text-black no-underline hover:underline underline-offset-2">
					{link.label}
				</a>
			{/each}

			<button
				type="button"
				class="text-black no-underline hover:underline underline-offset-2 cursor-pointer"
				onclick={openCookieSettings}
			>
				COOKIE SETTINGS
			</button>

			<div class="relative" bind:this={socialMenu}>
				<button
					type="button"
					class="text-black no-underline hover:underline underline-offset-2 cursor-pointer"
					onclick={toggleSocialMenu}
					aria-expanded={isSocialOpen}
					aria-controls="social-media-links"
				>
					SOCIAL MEDIA
				</button>

				{#if isSocialOpen}
					<div
						id="social-media-links"
						class="absolute bottom-full right-0 z-20 mb-4 flex flex-col gap-4 border border-black/15 bg-white px-5 py-4 shadow-lg dark:border-white/20 dark:bg-black"
					>
						<div class="flex flex-row gap-x-5 whitespace-nowrap">
							{#each socialLinks as link (link.url)}
								<a
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-black no-underline hover:underline underline-offset-2 dark:text-white"
								>
									{link.label}
								</a>
							{/each}
							<button
								type="button"
								class="text-black no-underline hover:underline underline-offset-2 dark:text-white"
								onclick={() => (isWhatsAppQrOpen = !isWhatsAppQrOpen)}
								aria-expanded={isWhatsAppQrOpen}
								aria-controls="whatsapp-qr"
							>
								WhatsApp
							</button>
						</div>

						{#if isWhatsAppQrOpen}
							<div id="whatsapp-qr" class="flex flex-col items-center gap-2 border-t border-black/10 pt-4 dark:border-white/20">
								<img
									src="/whatsapp-qr.jpg"
									alt="WhatsApp QR code"
									class="h-44 w-44 object-contain"
								/>
								<span class="text-[9px] uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
									Scan to connect
								</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</footer>
