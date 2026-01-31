<script lang="ts">
	import { useCart } from '$lib/stores/cart.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MESSAGES } from '$lib/messages';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import RemoteImage from '$lib/components/ui/RemoteImage.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FormInput from '$lib/components/ui/FormInput.svelte';
	import FormSelect from '$lib/components/ui/FormSelect.svelte';
	import ShippingOption from '$lib/components/ui/ShippingOption.svelte';
	import { DEFAULTS, COLORS, TYPOGRAPHY } from '$lib/constants';
	import type { Stripe, StripeElements } from '@stripe/stripe-js';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import { shippingAddressSchema, type ShippingAddressSchema } from '$lib/schemas';

	const cart = useCart();

	let { data }: { data: PageData } = $props();

	// Superforms init - data.form is intentionally captured once at init
	// svelte-ignore state_referenced_locally
	// Type casting required due to ZodEffects not matching Adapter expectations perfectly in strict mode
	const { form, errors, enhance } = superForm<ShippingAddressSchema>(data.form, {
		validators: zodClient(shippingAddressSchema as any),
		onResult: ({ result }) => {
			if (result.type === 'success') {
				step = 2;
				loading = false;
			} else if (result.type === 'failure') {
				loading = false;
				toastStore.show('Please check your entries', 'error');
			}
		},
		applyAction: false, // We handle state manually
		resetForm: false
	});

	let step = $state(1); // 1: Info, 2: Shipping, 3: Payment
	let loading = $state(false);

	// No local form state, use $form

	const countries = [
		'United States',
		'Canada',
		'United Kingdom',
		'Australia',
		'Germany',
		'France',
		'Japan'
	];

	// Shipping Options - 数据驱动配送选项
	const shippingOptions = [
		{
			id: 'standard',
			name: 'Standard Shipping',
			description: '5-7 Business Days',
			price: 'Free'
		},
		{
			id: 'express',
			name: 'Express Shipping',
			description: '2-3 Business Days',
			price: '$25.00',
			disabled: false
		}
	];

	// Removed validate() function - replaced by Zod schema

	let selectedShipping = $state('standard');

	// Coupon state
	interface AppliedCoupon {
		code: string;
		type: 'percentage' | 'fixed_amount';
		value: number;
		discountAmount: number;
		id: string;
	}
	let couponCode = $state('');
	let discount = $state(0);
	let applyingCoupon = $state(false);
	let appliedCoupon = $state<AppliedCoupon | null>(null);
	let couponMessage = $state(''); // Success or error message

	// handleStep1 removed, logic moved to superForm onResult

	// handleStep2 removed - logic is handled inline in form onsubmit

	import { onMount, tick } from 'svelte';

	let stripe = $state<Stripe | null>(null);
	let elements = $state<StripeElements | null>(null);
	let clientSecret = $state('');

	// Initialize Stripe and Pre-fill form
	onMount(async () => {
		if (data.stripeKey) {
			import('@stripe/stripe-js').then(async ({ loadStripe }) => {
				stripe = await loadStripe(data.stripeKey as string);
			});
		}

		// Pre-fill form if user is logged in
		if (auth.user) {
			$form.email = auth.user.email || '';
			if (auth.user.name) {
				const parts = auth.user.name.split(' ');
				$form.firstName = parts[0] || '';
				$form.lastName = parts.slice(1).join(' ') || '';
			}
		}
	});

	async function handleApplyCoupon() {
		if (!couponCode) return;
		applyingCoupon = true;
		couponMessage = '';

		try {
			const res = await fetch('/api/coupons/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: couponCode,
					cartTotal: cart.subtotal // Send raw numeric subtotal
				})
			});
			const data = await res.json();

			if (data.error) {
				couponMessage = data.error.toUpperCase();
				discount = 0;
				appliedCoupon = null;
			} else {
				appliedCoupon = data.coupon;
				// Ensure value is treated as number
				discount = Number(data.coupon.discountAmount);
				couponMessage = MESSAGES.INFO.COUPON_APPLIED(data.coupon.code);
			}
		} catch (e) {
			console.error(e);
			couponMessage = MESSAGES.ERROR.FAILED_TO_VERIFY_COUPON;
		} finally {
			applyingCoupon = false;
		}
	}

	let taxAmount = $state(0);

	// Step 2 -> 3 Transition: Create PaymentIntent and Mount Element
	async function initializePayment() {
		loading = true;

		try {
			// 1. Create PaymentIntent on server & Create Pending Order
			if (cart.items.length === 0) {
				alert('Your cart appears to be empty. Please refresh the page.');
				loading = false;
				return;
			}

			const payload = {
				items: $state.snapshot(cart.items),
				shippingInfo: {
					name: `${$form.firstName} ${$form.lastName}`,
					line1: $form.address,
					city: $form.city,
					postalCode: $form.zip,
					country: $form.country
				},
				customerInfo: {
					email: $form.email,
					name: `${$form.firstName} ${$form.lastName}`,
					userId: auth.user && !auth.user.isAdmin ? auth.user.id : undefined, // Only link if regular user, not Admin
					currency: cart.currencyCode
				},
				couponCode: undefined as string | undefined
			};
			if (appliedCoupon) {
				payload.couponCode = appliedCoupon.code;
			}

			const res = await fetch('/api/payment-intent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await res.json();

			if (result.error) throw new Error(result.error);
			clientSecret = result.clientSecret;
			if (result.taxAmount) {
				taxAmount = result.taxAmount;
			}

			// 2. Wait for UI to update (render Step 3 div)
			step = 3;
			await tick();

			// 3. Initialize Elements
			if (!stripe) {
				throw new Error('Stripe not loaded. Check your PUBLIC_STRIPE_KEY.');
			}

			elements = stripe.elements({
				clientSecret,
				appearance: {
					theme: 'stripe',
					variables: {
						colorPrimary: '#000000'
					}
				}
			});

			const paymentElement = elements.create('payment', {
				layout: 'tabs'
			});
			paymentElement.mount('#payment-element');

			loading = false;
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : String(e);
			console.error('❌ Payment initialization failed:', message);
			alert('Failed to initialize payment: ' + message);
			step = 2; // Go back
			loading = false;
		}
	}

	async function confirmPayment() {
		if (!stripe || !elements) return;

		loading = true;

		const { error } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				// Return URL where the user is redirected after the payment
				return_url: `${window.location.origin}/checkout/success`,
				payment_method_data: {
					billing_details: {
						name: `${$form.firstName} ${$form.lastName}`,
						email: $form.email,
						address: {
							line1: $form.address,
							city: $form.city,
							postal_code: $form.zip,
							country: 'US' // Simplification for demo
						}
					}
				}
			}
		});

		if (error) {
			// This point will only be reached if there is an immediate error when
			// confirming the payment. Show error to your customer (e.g., payment
			// details incomplete)
			toastStore.error(error.message?.toUpperCase() || 'PAYMENT ERROR');
			loading = false;
		} else {
			// Your customer will be redirected to your `return_url`. For some payment
			// methods like iDEAL, your customer will be redirected to an intermediate
			// site first to authorize the payment, then redirected to the `return_url`.
		}
	}

	// Simple formatter for local calculations
	function formatMoney(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: cart.currencyCode
		}).format(amount);
	}

	// 共用样式
	const stepHeading = 'text-xl font-display font-bold uppercase tracking-widest mb-6';
</script>

{#snippet summaryRow(label: string, value: string | number, highlight = false)}
	<div
		class="flex justify-between items-center text-xs {COLORS.text} font-bold uppercase tracking-wide {highlight
			? 'text-red-500'
			: ''}"
	>
		<span>{label}</span>
		<span>{value}</span>
	</div>
{/snippet}

<svelte:head>
	<title>Checkout | {data.settings.siteName}</title>
	<meta name="description" content="Complete your purchase securely." />
</svelte:head>

<div class="min-h-screen {COLORS.bg} pt-32 pb-20">
	<div
		class="max-w-[1200px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24"
	>
		<!-- Left Column: Checkout Logic -->
		<div class="lg:col-span-7">
			<!-- Progress Bar -->
			<div class="w-full h-[1px] bg-primary/10 dark:bg-white/10 mb-8 relative overflow-hidden">
				<div
					class="absolute top-0 left-0 h-full bg-primary dark:bg-white transition-all duration-700 ease-out"
					style="width: {((step - 1) / 2) * 100}%"
				></div>
			</div>

			<!-- Breadcrumbs -->
			<div class="flex items-center gap-2 text-xs uppercase tracking-widest mb-8 {COLORS.text}">
				<span class="{step >= 1 ? 'font-bold' : 'opacity-40'} transition-all duration-500"
					>Information</span
				>

				<span
					class="flex items-center gap-2 {step >= 2
						? 'font-bold'
						: 'opacity-40'} transition-all duration-500"
				>
					<span class="material-symbols-outlined text-[10px]">chevron_right</span>
					Shipping
				</span>

				<span
					class="flex items-center gap-2 {step >= 3
						? 'font-bold'
						: 'opacity-40'} transition-all duration-500"
				>
					<span class="material-symbols-outlined text-[10px]">chevron_right</span>
					Payment
				</span>
			</div>

			<!-- Step 1: Information -->
			{#if step === 1}
				<div in:fly={{ y: 20, duration: 600, easing: cubicOut, delay: 200 }}>
					<h2 class={stepHeading}>Contact Information</h2>
					<form method="POST" use:enhance class="flex flex-col gap-4" novalidate>
						<FormInput
							id="checkout-email"
							name="email"
							label="Email Address"
							type="email"
							autocomplete="email"
							bind:value={$form.email}
							error={$errors.email ? $errors.email[0] : ''}
							placeholder="john@example.com"
						/>

						<h2 class="{stepHeading} mt-8">Shipping Address</h2>

						<div class="grid grid-cols-2 gap-4">
							<FormInput
								id="checkout-first-name"
								name="firstName"
								label="First Name"
								autocomplete="given-name"
								bind:value={$form.firstName}
								error={$errors.firstName ? $errors.firstName[0] : ''}
							/>
							<FormInput
								id="checkout-last-name"
								name="lastName"
								label="Last Name"
								autocomplete="family-name"
								bind:value={$form.lastName}
								error={$errors.lastName ? $errors.lastName[0] : ''}
							/>
						</div>

						<FormInput
							id="checkout-address"
							name="address"
							label="Address"
							autocomplete="address-line1"
							bind:value={$form.address}
							error={$errors.address ? $errors.address[0] : ''}
						/>

						<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<FormInput
								id="checkout-zip"
								name="zip"
								label="Zip Code"
								autocomplete="postal-code"
								bind:value={$form.zip}
								error={$errors.zip ? $errors.zip[0] : ''}
								className="col-span-1"
							/>
							<FormInput
								id="checkout-city"
								name="city"
								label="City"
								autocomplete="address-level2"
								bind:value={$form.city}
								error={$errors.city ? $errors.city[0] : ''}
								className="col-span-1"
							/>
							<FormSelect
								id="checkout-country"
								label="Country"
								bind:value={$form.country}
								options={countries}
								className="col-span-1"
								hideLabel={true}
							/>
						</div>

						<Button type="submit" size="lg" className="mt-8 w-full">
							{#if loading}
								<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span
								>
							{:else}
								Continue
							{/if}
						</Button>
					</form>
				</div>

				<!-- Step 2: Shipping -->
			{:else if step === 2}
				<div
					in:fly={{
						y: 20,
						duration: 600,
						delay: 200,
						easing: cubicOut
					}}
				>
					<h2 class={stepHeading}>Shipping Method</h2>

					<div class="border {COLORS.border} p-4 mb-8">
						<div class="flex justify-between items-center mb-2">
							<span class="{TYPOGRAPHY.labelLg} {COLORS.text}">Contact</span>
							<span class="text-xs font-medium">{$form.email}</span>
						</div>
						<div class="h-px bg-primary dark:bg-white my-2"></div>
						<div class="flex justify-between items-center">
							<span class="{TYPOGRAPHY.labelLg} {COLORS.text}">Ship to</span>
							<span class="text-xs font-medium">{$form.address}, {$form.city}, {$form.zip}</span>
						</div>
					</div>

					<form
						onsubmit={(e) => {
							e.preventDefault();
							initializePayment();
						}}
					>
						<div class="flex flex-col gap-4">
							{#each shippingOptions as option (option.id)}
								<ShippingOption
									{option}
									selected={selectedShipping === option.id}
									onSelect={(id) => (selectedShipping = id)}
								/>
							{/each}
						</div>

						<div class="flex gap-4 mt-8">
							<Button variant="outline" size="lg" className="flex-1" onclick={() => (step = 1)}>
								Back
							</Button>
							<Button type="submit" size="lg" className="flex-[2]">
								{#if loading}
									<span class="material-symbols-outlined animate-spin text-sm"
										>progress_activity</span
									>
								{:else}
									Continue
								{/if}
							</Button>
						</div>
					</form>
				</div>

				<!-- Step 3: Payment -->
			{:else if step === 3}
				<div
					in:fly={{
						y: 20,
						duration: 600,
						delay: 200,
						easing: cubicOut
					}}
				>
					<h2 class={stepHeading}>Payment</h2>
					<div class="mb-6">
						<!-- Stripe Payment Element will be mounted here -->
						<div id="payment-element"></div>
					</div>

					<Button
						size="lg"
						className="w-full"
						disabled={loading || !stripe || !elements}
						onclick={confirmPayment}
					>
						{#if loading}
							<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
							<span>Processing...</span>
						{:else}
							Pay Now {cart.totalFormatted}
						{/if}
					</Button>
					<button
						class="mt-4 text-xs underline {COLORS.text} uppercase tracking-widest font-bold cursor-pointer"
						onclick={() => (step = 2)}
					>
						Back to Shipping
					</button>
					<!-- Tax Notice -->
					<p class="mt-4 text-[10px] text-center opacity-60">
						Sales tax and duties will be calculated automatically based on your location.
					</p>
				</div>
			{/if}
		</div>

		<!-- Right Column: Order Summary -->
		<div
			class="lg:col-span-5 bg-primary/5 dark:bg-white/5 p-8 h-fit lg:sticky lg:top-32 z-[var(--z-sticky)]"
		>
			<h3 class="text-sm font-bold uppercase tracking-widest mb-6">Order Summary</h3>

			<div class="flex flex-col gap-6 mb-8 max-h-[40vh] overflow-y-auto scrollbar-hide">
				{#each cart.items as item (item.id + (item.variantId || ''))}
					<div class="flex gap-4">
						<div class="w-16 aspect-[3/4] bg-primary/5 dark:bg-white/5 relative overflow-hidden">
							<RemoteImage
								src={item.image || ''}
								alt={item.title || 'Product Image'}
								className="w-full h-full"
							/>
							<span
								class="absolute top-1 right-1 bg-primary/80 dark:bg-white/80 text-white dark:text-primary text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold"
							>
								{item.quantity}
							</span>
						</div>
						<div class="flex-1 flex flex-col justify-center">
							<h4 class="text-xs font-bold uppercase tracking-wide">
								{item.title}
							</h4>
							<p class="text-[10px] {COLORS.text} uppercase tracking-wider">
								{item.color} / {item.size}
							</p>
						</div>
						<div class="flex flex-col justify-center">
							<span class="text-xs font-bold">{formatMoney(item.price || 0)}</span>
						</div>
					</div>
				{/each}
				{#if cart.items.length === 0}
					<p class="text-xs opacity-50 text-center py-4">Your cart is empty</p>
				{/if}
			</div>

			<div class="h-px bg-primary/20 dark:bg-white/20 mb-6"></div>

			<div class="space-y-4 mb-6">
				<!-- Coupon Input -->
				<div class="flex gap-2">
					<label for="coupon-code" class="sr-only">Discount code</label>
					<input
						id="coupon-code"
						type="text"
						bind:value={couponCode}
						placeholder="Discount code"
						class="flex-1 bg-transparent border {COLORS.border} px-3 py-2 text-sm uppercase tracking-wider outline-none focus:border-primary dark:focus:border-white transition-colors"
						disabled={applyingCoupon || step === 3}
						aria-describedby={couponMessage ? 'coupon-message' : undefined}
					/>
					<Button
						size="sm"
						disabled={!couponCode || applyingCoupon || step === 3}
						onclick={handleApplyCoupon}
						variant="outline"
					>
						{applyingCoupon ? '...' : 'Apply'}
					</Button>
				</div>
				{#if couponMessage}
					<p
						id="coupon-message"
						class="text-[10px] font-bold uppercase tracking-wider {appliedCoupon
							? 'text-green-600'
							: 'text-red-500'}"
						role="status"
					>
						{couponMessage}
					</p>
				{/if}

				{@render summaryRow('Subtotal', cart.subtotalFormatted)}

				{#if discount > 0}
					<div in:fly={{ x: 10, duration: 400, easing: cubicOut }}>
						{@render summaryRow('Discount', `-${formatMoney(discount)}`, true)}
					</div>
				{/if}

				{@render summaryRow(
					'Shipping',
					cart.total >= DEFAULTS.freeShippingThreshold ? 'Free' : 'Calculated at next step'
				)}

				<!-- Tax placeholder -->
				{#if step === 3}
					<div in:fade>
						{@render summaryRow(
							`Tax (${taxAmount > 0 ? 'Included' : 'Estimated'})`,
							taxAmount > 0 ? formatMoney(taxAmount) : 'Calculated by Stripe'
						)}
					</div>
				{/if}
			</div>

			<div class="h-px bg-primary/20 dark:bg-white/20 mb-6"></div>

			<div class="flex justify-between items-center">
				<span class="text-sm font-bold uppercase tracking-widest">Total</span>
				<div class="flex items-baseline gap-2">
					<span class="text-xs {COLORS.text} font-bold">{cart.currencyCode}</span>
					{#key discount}
						<span
							class="text-xl font-display font-medium inline-block"
							in:fly={{ y: -10, duration: 400, easing: cubicOut }}
						>
							{formatMoney(Math.max(0, cart.subtotal - discount + (taxAmount || 0)))}
						</span>
					{/key}
				</div>
			</div>
		</div>
	</div>
</div>
