<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	const COOKIE_CONSENT_KEY = 'cookie_consent';
	const COOKIE_CONSENT_EVENT = 'cookie-consent-change';
	const COOKIE_SETTINGS_OPEN_EVENT = 'cookie-settings-open';

	let isVisible = $state(false);

	onMount(() => {
		const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
		if (!consent) {
			setTimeout(() => {
				isVisible = true;
			}, 800);
		}

		const openSettings = () => {
			isVisible = true;
		};

		window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);

		return () => {
			window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);
		};
	});

	function setConsent(status: 'accepted' | 'declined') {
		localStorage.setItem(COOKIE_CONSENT_KEY, status);
		window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { status } }));
		isVisible = false;
	}

	function accept() {
		setConsent('accepted');
	}

	function decline() {
		setConsent('declined');
	}

	$effect(() => {
		if (!isVisible) return;

		const root = document.documentElement;
		const previousRootOverflow = root.style.overflow;
		const previousBodyOverflow = document.body.style.overflow;
		const previousBodyPosition = document.body.style.position;
		const previousBodyTop = document.body.style.top;
		const previousBodyLeft = document.body.style.left;
		const previousBodyRight = document.body.style.right;
		const previousBodyWidth = document.body.style.width;
		const scrollY = window.scrollY;

		root.style.overflow = 'hidden';
		document.body.style.overflow = 'hidden';
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollY}px`;
		document.body.style.left = '0';
		document.body.style.right = '0';
		document.body.style.width = '100%';

		return () => {
			root.style.overflow = previousRootOverflow;
			document.body.style.overflow = previousBodyOverflow;
			document.body.style.position = previousBodyPosition;
			document.body.style.top = previousBodyTop;
			document.body.style.left = previousBodyLeft;
			document.body.style.right = previousBodyRight;
			document.body.style.width = previousBodyWidth;
			window.scrollTo(0, scrollY);
		};
	});
</script>

{#if isVisible}
	<div
		transition:fade={{ duration: 400 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="cookie-banner-title"
		aria-describedby="cookie-banner-desc"
		class="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm p-4"
	>
		<div class="w-full max-w-md bg-white p-10 border border-black">
			<h2 id="cookie-banner-title" class="text-xl font-medium text-black mb-4 tracking-tight">
				Cookies.
			</h2>
			<p id="cookie-banner-desc" class="text-sm text-black mb-10 leading-relaxed">
				We use cookies to ensure you get the best experience. By continuing to use this site, you
				consent to our use of cookies.
			</p>

			<div class="flex flex-col sm:flex-row items-center justify-end gap-4">
				<button
					class="w-full sm:w-auto px-8 py-3 border border-black bg-transparent text-black text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-black hover:text-white transition-colors duration-200"
					onclick={decline}
				>
					Essential Only
				</button>
				<button
					class="w-full sm:w-auto px-8 py-3 border border-black bg-transparent text-black text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-black hover:text-white transition-colors duration-200"
					onclick={accept}
				>
					Accept
				</button>
			</div>
		</div>
	</div>
{/if}
