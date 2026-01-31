<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MESSAGES } from '$lib/messages';
	import FormInput from '$lib/components/ui/FormInput.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { loginSchema, registerSchema, passwordRecoverySchema } from '$lib/schemas';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Login Form (SPA Mode)
	const {
		form: loginForm,
		errors: loginErrors,
		enhance: loginEnhance,
		submitting: loginSubmitting
	} = superForm(data.loginForm, {
		SPA: true,
		id: 'login-form',
		validators: zod(loginSchema),
		onUpdate: async ({ form }) => {
			if (form.valid) {
				const success = await auth.login(form.data.email, form.data.password);
				if (success) {
					toastStore.show(MESSAGES.SUCCESS.WELCOME_BACK, 'success');
					handleRedirectAfterAuth();
				}
			}
		}
	});

	// Register Form (SPA Mode)
	const {
		form: regForm,
		errors: regErrors,
		enhance: regEnhance,
		submitting: regSubmitting
	} = superForm(data.registerForm, {
		SPA: true,
		id: 'register-form',
		validators: zod(registerSchema),
		onUpdate: async ({ form }) => {
			if (form.valid) {
				const fullName = `${form.data.firstName} ${form.data.lastName}`.trim();
				const success = await auth.register(
					form.data.email,
					form.data.password,
					fullName || undefined
				);
				if (success) {
					verificationSent = true;
					toastStore.show(MESSAGES.SUCCESS.EMAIL_VERIFICATION_SENT, 'info');
				}
			}
		}
	});

	// Recover Form (SPA Mode)
	const {
		form: recForm,
		errors: recErrors,
		enhance: recEnhance,
		submitting: recSubmitting
	} = superForm(data.recoverForm, {
		SPA: true,
		id: 'recover-form',
		validators: zod(passwordRecoverySchema),
		onUpdate: async ({ form }) => {
			if (form.valid) {
				const success = await auth.resetPassword(form.data.email);
				if (success) {
					toastStore.show(MESSAGES.SUCCESS.PASSWORD_RESET_SENT, 'success');
					isRecovering = false; // Go back to login
				}
			}
		}
	});

	let isLogin = $state(true);
	let isRecovering = $state(false);
	let verificationSent = $state(false);

	// Derived state from auth store
	let isLoggedIn = $derived(auth.isAuthenticated);
	let isLoading = $derived(auth.isLoading || $loginSubmitting || $regSubmitting || $recSubmitting);
	let authError = $derived(auth.error);
	let currentUser = $derived(auth.user);

	// 当 authError 变化时，通过 Toast 显示
	$effect(() => {
		if (authError) {
			toastStore.show(authError, 'error');
		}
	});

	// Helper: Handle redirect after successful authentication
	function handleRedirectAfterAuth() {
		const redirect = $page.url.searchParams.get('redirect');
		if (redirect) {
			setTimeout(() => goto(redirect), 500);
		}
	}

	async function handleGoogleLogin() {
		auth.clearError();
		const success = await auth.loginWithGoogle();

		if (success) {
			toastStore.show('Welcome back!', 'success');
			handleRedirectAfterAuth();
		}
	}

	function handleLogout() {
		auth.logout();
		toastStore.show(MESSAGES.SUCCESS.SIGNED_OUT, 'info');
	}
</script>

{#snippet identityCard()}
	<!-- Identity / Membership Card -->
	<div
		class="absolute inset-0 z-50 bg-white dark:bg-black flex items-center justify-center p-8"
		in:fade={{ duration: 400 }}
	>
		<div
			class="w-full max-w-sm border border-primary dark:border-white p-8 relative overflow-hidden"
			in:fly={{ y: 20, duration: 800, delay: 200 }}
		>
			<!-- Scan Line Effect -->
			<div
				class="absolute top-0 left-0 w-full h-1 bg-primary/20 dark:bg-white/20 animate-[scan_2s_ease-in-out_infinite]"
			></div>

			<div class="flex justify-between items-start mb-12">
				<div
					class="w-12 h-12 bg-primary dark:bg-white flex items-center justify-center text-white dark:text-primary font-bold text-xl"
				>
					{currentUser!.name?.[0]?.toUpperCase() || currentUser!.email[0].toUpperCase()}
				</div>
				<span class="font-sans text-[10px] tracking-[0.1em] text-primary/60 dark:text-white/60">
					{currentUser!.isAdmin ? 'ADMIN' : currentUser!.verified ? 'VERIFIED' : 'UNVERIFIED'}
				</span>
			</div>

			<div class="space-y-2 mb-12">
				<h2 class="text-2xl font-display uppercase tracking-widest">
					{currentUser!.name || 'Member'}
				</h2>
				<p class="text-[10px] uppercase tracking-[0.2em] text-primary/60 dark:text-white/60">
					{currentUser!.email}
				</p>
				<p class="text-[10px] uppercase tracking-[0.2em] text-primary/40 dark:text-white/40">
					ID: {currentUser!.id.slice(0, 8).toUpperCase()}
				</p>
			</div>

			<div class="flex flex-col gap-4">
				<a
					href="/account/orders"
					class="text-[10px] uppercase tracking-[0.2em] font-bold border border-primary dark:border-white py-3 px-4 text-center hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all"
				>
					Order History
				</a>
				<a
					href="/account/addresses"
					class="text-[10px] uppercase tracking-[0.2em] font-bold border border-primary dark:border-white py-3 px-4 text-center hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all"
				>
					Address Book
				</a>
				<button
					class="text-[10px] uppercase tracking-[0.2em] font-bold border-b border-transparent hover:border-current transition-colors mt-4 cursor-pointer"
					onclick={handleLogout}
				>
					Sign Out
				</button>
			</div>
		</div>
	</div>
{/snippet}

{#snippet verificationSentState()}
	<div class="w-full max-w-sm mx-auto" in:fade>
		<div class="mb-12 text-center">
			<div class="flex justify-center mb-6">
				<span class="material-symbols-outlined text-4xl text-primary dark:text-white font-light"
					>mark_email_read</span
				>
			</div>
			<h1 class="text-2xl font-display font-bold uppercase tracking-widest mb-4">
				Check Your Email
			</h1>
			<p
				class="text-xs uppercase tracking-[0.15em] text-primary/60 dark:text-white/60 mb-8 leading-relaxed"
			>
				We've sent a verification link to<br />
				<span class="text-primary dark:text-white font-bold">{$regForm.email}</span>
			</p>
			<p class="text-[10px] uppercase tracking-[0.1em] text-primary/40 dark:text-white/40">
				Please verify your account to continue.
			</p>
		</div>

		<div class="text-center">
			<button
				onclick={() => {
					verificationSent = false;
					isLogin = true;
				}}
				class="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-transparent hover:border-primary dark:hover:border-white transition-colors duration-300 pb-0.5 cursor-pointer"
			>
				Back to Login
			</button>
		</div>
	</div>
{/snippet}

<svelte:head>
	<title>Account | {data.settings.siteName}</title>
	<meta
		name="description"
		content="Access your personal collection and manage your {data.settings.siteName} membership."
	/>
</svelte:head>

<div
	class="grid grid-cols-1 md:grid-cols-2 min-h-screen bg-background-light dark:bg-background-dark pt-[48px]"
>
	<!-- Left Column: Visual -->
	<div
		class="relative hidden md:block h-[calc(100vh-48px)] sticky top-[48px] overflow-hidden {data
			.page?.heroImage
			? 'bg-black'
			: 'bg-background-light dark:bg-background-dark'}"
	>
		{#if data.page?.heroImage}
			<img
				src={data.page.heroImage}
				alt="Editorial"
				class="w-full h-full object-cover opacity-80"
				loading="lazy"
			/>
		{/if}
	</div>

	<!-- Right Column: Form or Identity -->
	<div class="flex flex-col justify-center px-8 md:px-24 py-24 relative overflow-hidden">
		<!-- Back Navigation -->
		{#if !isLoading}
			<a
				href="/"
				class="absolute top-8 right-8 md:top-12 md:right-12 flex items-center justify-center text-primary dark:text-white hover:opacity-50 transition-opacity"
				aria-label="Close"
			>
				<span class="material-symbols-outlined font-light">close</span>
			</a>
		{/if}

		{#if isLoggedIn && currentUser}
			{@render identityCard()}
		{:else if verificationSent}
			{@render verificationSentState()}
		{:else}
			<div class="w-full max-w-sm mx-auto" in:fade>
				<div class="mb-12">
					<h1 class="text-3xl font-display font-bold uppercase tracking-widest mb-2">
						{isRecovering ? 'Recovery' : isLogin ? 'Identify' : 'Join'}
					</h1>
					<p class="text-xs uppercase tracking-[0.15em] text-primary/60 dark:text-white/60">
						{isRecovering
							? 'Retrieve access to your account'
							: isLogin
								? 'Access your personal collection'
								: 'Become a member'}
					</p>
				</div>

				{#if isRecovering}
					<!-- Recovery Form -->
					<form class="flex flex-col gap-8" method="POST" use:recEnhance>
						<FormInput
							id="email_rec"
							type="email"
							bind:value={$recForm.email}
							label="Email Address"
							required={true}
							disabled={isLoading}
							error={$recErrors.email ? $recErrors.email[0] : ''}
						/>

						<button
							type="submit"
							class="w-full bg-primary text-white dark:bg-white dark:text-primary h-14 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity mt-4 cursor-pointer flex items-center justify-center disabled:opacity-50"
							disabled={isLoading}
						>
							{#if isLoading}
								<span class="animate-pulse">Processing...</span>
							{:else}
								Send Link
							{/if}
						</button>

						<div class="text-center">
							<button
								type="button"
								onclick={() => (isRecovering = false)}
								class="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-transparent hover:border-primary dark:hover:border-white transition-colors duration-300 pb-1 cursor-pointer"
								disabled={isLoading}
							>
								Back to Login
							</button>
						</div>
					</form>
				{:else if isLogin}
					<form class="flex flex-col gap-8" method="POST" use:loginEnhance>
						<FormInput
							id="email"
							type="email"
							bind:value={$loginForm.email}
							label="Email Address"
							required={true}
							disabled={isLoading}
							error={$loginErrors.email ? $loginErrors.email[0] : ''}
						/>

						<FormInput
							id="password"
							type="password"
							bind:value={$loginForm.password}
							label="Password"
							required={true}
							disabled={isLoading}
							error={$loginErrors.password ? $loginErrors.password[0] : ''}
						/>

						<div class="flex justify-end">
							<button
								type="button"
								class="text-[10px] font-bold uppercase tracking-[0.1em] text-primary dark:text-white border-b border-transparent hover:border-primary dark:hover:border-white transition-colors duration-300 pb-0.5 cursor-pointer"
								onclick={() => {
									if ($loginForm.email) $recForm.email = $loginForm.email;
									isRecovering = true;
								}}
								disabled={isLoading}
							>
								Recover Password
							</button>
						</div>

						<button
							type="submit"
							class="w-full bg-primary text-white dark:bg-white dark:text-primary h-14 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity mt-4 cursor-pointer flex items-center justify-center disabled:opacity-50"
							disabled={isLoading}
						>
							{#if isLoading}
								<span class="animate-pulse">Verifying...</span>
							{:else}
								Enter
							{/if}
						</button>

						<button
							type="button"
							class="w-full border border-primary dark:border-white h-14 text-xs font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50"
							onclick={handleGoogleLogin}
							disabled={isLoading}
						>
							<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Google
						</button>
					</form>

					<div class="mt-12 pt-8 border-t border-primary/10 dark:border-white/10">
						<p class="text-[10px] uppercase tracking-[0.15em] mb-4 text-center">New Client?</p>
						<button
							onclick={() => (isLogin = false)}
							class="w-full border border-primary dark:border-white h-12 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all cursor-pointer"
							disabled={isLoading}
						>
							Create Account
						</button>
					</div>
				{:else}
					<form class="flex flex-col gap-8" method="POST" use:regEnhance>
						<div class="grid grid-cols-2 gap-x-4 gap-y-8">
							<FormInput
								id="fname"
								bind:value={$regForm.firstName}
								label="First Name"
								required={true}
								disabled={isLoading}
								error={$regErrors.firstName ? $regErrors.firstName[0] : ''}
							/>

							<FormInput
								id="lname"
								bind:value={$regForm.lastName}
								label="Last Name"
								required={true}
								disabled={isLoading}
								error={$regErrors.lastName ? $regErrors.lastName[0] : ''}
							/>

							<div class="col-span-2">
								<FormInput
									id="email_reg"
									type="email"
									bind:value={$regForm.email}
									label="Email Address"
									required={true}
									disabled={isLoading}
									error={$regErrors.email ? $regErrors.email[0] : ''}
								/>
							</div>

							<div class="col-span-2">
								<FormInput
									id="pass_reg"
									type="password"
									bind:value={$regForm.password}
									label="Password"
									required={true}
									disabled={isLoading}
									autocomplete="new-password"
									error={$regErrors.password ? $regErrors.password[0] : ''}
								/>
							</div>

							<div class="col-span-2">
								<FormInput
									id="pass_confirm"
									type="password"
									bind:value={$regForm.confirmPassword}
									label="Confirm Password"
									required={true}
									disabled={isLoading}
									autocomplete="new-password"
									error={$regErrors.confirmPassword ? $regErrors.confirmPassword[0] : ''}
								/>
							</div>

							<button
								type="submit"
								class="col-span-2 w-full bg-primary text-white dark:bg-white dark:text-primary h-14 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity mt-8 cursor-pointer flex items-center justify-center disabled:opacity-50"
								disabled={isLoading}
							>
								{#if isLoading}
									<span class="animate-pulse">Processing...</span>
								{:else}
									Join
								{/if}
							</button>
						</div>
					</form>
					<div class="mt-8 text-center">
						<button
							onclick={() => (isLogin = true)}
							class="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-transparent hover:border-primary dark:hover:border-white transition-colors duration-300 pb-1 cursor-pointer"
							disabled={isLoading}
						>
							Back to Login
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes scan {
		0% {
			top: 0%;
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		80% {
			opacity: 1;
		}
		100% {
			top: 100%;
			opacity: 0;
		}
	}
</style>
