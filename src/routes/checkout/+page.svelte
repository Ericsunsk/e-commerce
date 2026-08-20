<script lang="ts">
	import { useCart } from '$lib/stores/cart.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MESSAGES } from '$lib/messages';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import OrderItemThumbnail from '$lib/components/ui/OrderItemThumbnail.svelte';
	import LineItemMeta from '$lib/components/ui/LineItemMeta.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FormInput from '$lib/components/ui/FormInput.svelte';
	import FormSelect from '$lib/components/ui/FormSelect.svelte';
	import ShippingOption from '$lib/components/ui/ShippingOption.svelte';
	import { COLORS, TYPOGRAPHY } from '$lib/constants';
	import { buildFullName } from '$lib/utils/name';
	import { formatCurrency } from '$lib/utils/price';
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
		validators: zodClient(shippingAddressSchema as unknown as Parameters<typeof zodClient>[0]),
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
	let pricing = $state<null | {
		subtotal: number;
		discount: number;
		shipping: number;
		tax: number;
		total: number;
	}>(null);

	// No local form state, use $form

	const countries = [
		{ label: 'United States', value: 'US' },
		{ label: 'Canada', value: 'CA' },
		{ label: 'United Kingdom', value: 'GB' },
		{ label: 'Australia', value: 'AU' },
		{ label: 'Germany', value: 'DE' },
		{ label: 'France', value: 'FR' },
		{ label: 'Japan', value: 'JP' }
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
	let stripeReady: Promise<Stripe | null> | null = null;

	// Initialize Stripe and Pre-fill form
	onMount(async () => {
		if (data.stripeKey) {
			stripeReady = import('@stripe/stripe-js').then(({ loadStripe }) =>
				loadStripe(data.stripeKey as string)
			);
			stripeReady.then((instance) => {
				stripe = instance;
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

		// Set default country if empty
		if (!$form.country) {
			$form.country = 'US';
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
	let totalAmount = $state<number | null>(null);

	function getCheckoutFullName() {
		return buildFullName($form.firstName, $form.lastName);
	}

	function getCheckoutCountryCode() {
		return $form.country.length === 2 ? $form.country : 'US';
	}

	function getCheckoutShippingInfo() {
		return {
			name: getCheckoutFullName(),
			line1: $form.address,
			city: $form.city,
			state: $form.state,
			postalCode: $form.zip,
			country: getCheckoutCountryCode()
		};
	}

	function getCheckoutBillingAddress() {
		return {
			line1: $form.address,
			city: $form.city,
			state: $form.state,
			postal_code: $form.zip,
			country: getCheckoutCountryCode()
		};
	}

	function firstError(messages: string[] | undefined | null): string {
		return messages?.[0] ?? '';
	}

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
				shippingOptionId: selectedShipping,
				shippingInfo: getCheckoutShippingInfo(),
				customerInfo: {
					email: $form.email,
					name: getCheckoutFullName(),
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
			taxAmount = Number(result.taxAmount || 0);
			totalAmount = Number(result.totalAmount || 0);
			pricing = {
				subtotal: Number(result.subtotalAmount || cart.subtotal),
				discount: Number(result.discountAmount || 0),
				shipping: Number(result.shippingAmount || 0),
				tax: Number(result.taxAmount || 0),
				total: Number(result.totalAmount || 0)
			};
			// Align UI discount with server-applied discount.
			discount = pricing.discount;

			// 2. Wait for UI to update (render Step 3 div)
			step = 3;
			await tick();

			// 3. Initialize Elements
			const stripeInstance = stripe ?? (stripeReady ? await stripeReady : null);
			if (!stripeInstance) {
				throw new Error('Stripe not loaded. Check your PUBLIC_STRIPE_KEY.');
			}
			stripe = stripeInstance;

			elements = stripeInstance.elements({
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
			pricing = null;
			totalAmount = null;
			taxAmount = 0;
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
						name: getCheckoutFullName(),
						email: $form.email,
						address: getCheckoutBillingAddress()
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
		return formatCurrency(amount, {
			currency: cart.currencyCode,
			locale: 'en-US'
		});
	}

	function getEstimatedShippingAmount() {
		return selectedShipping === 'express' ? 25 : 0;
	}

	function getDisplayedShippingAmount() {
		return pricing?.shipping ?? getEstimatedShippingAmount();
	}

	function getShippingDisplayLabel() {
		if (step === 1) {
			return 'Calculated at next step';
		}
		const shippingAmount = getDisplayedShippingAmount();
		return shippingAmount > 0 ? formatMoney(shippingAmount) : 'Free';
	}

	function getPayNowDisplayTotal() {
		return pricing?.total ?? totalAmount ?? Math.max(0, cart.subtotal - discount);
	}

	function getSummaryDisplayTotal() {
		return (
			pricing?.total ??
			Math.max(0, cart.subtotal - discount + (step >= 2 ? getEstimatedShippingAmount() : 0))
		);
	}

	// 共用样式
	const stepHeading = 'text-xl font-display font-bold uppercase tracking-widest mb-6';
	const stepPanelTransition = { y: 20, duration: 600, delay: 200, easing: cubicOut };
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

{#snippet stepTitle(title: string, className: string)}
	<h2 class={className}>{title}</h2>
{/snippet}

{#snippet loadingSpinnerIcon()}
	<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
{/snippet}

{#snippet continueSubmitButton(className: string)}
	<Button type="submit" size="lg" {className}>
		{#if loading}
			{@render loadingSpinnerIcon()}
		{:else}
			Continue
		{/if}
	</Button>
{/snippet}

{#snippet orderSummaryDivider()}
	<div class="h-px bg-primary/20 dark:bg-white/20 mb-6"></div>
{/snippet}

{#snippet breadcrumbItem(label: string, active: boolean, withChevron = true)}
	<span
		class="{withChevron ? 'flex items-center gap-2' : ''} {active
			? 'font-bold'
			: 'opacity-40'} transition-all duration-500"
	>
		{#if withChevron}
			<span class="material-symbols-outlined text-[10px]">chevron_right</span>
		{/if}
		{label}
	</span>
{/snippet}

{#snippet stepBackButton(label: string, targetStep: number, className: string)}
	<Button variant="outline" size="lg" {className} onclick={() => (step = targetStep)}>
		{label}
	</Button>
{/snippet}

{#snippet stepBackTextButton(label: string, targetStep: number, className: string)}
	<button class={className} onclick={() => (step = targetStep)}>
		{label}
	</button>
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
				{@render breadcrumbItem('Information', step >= 1, false)}
				{@render breadcrumbItem('Shipping', step >= 2)}
				{@render breadcrumbItem('Payment', step >= 3)}
			</div>

			<!-- Step 1: Information -->
			{#if step === 1}
				<div in:fly={stepPanelTransition}>
					{@render stepTitle('Contact Information', stepHeading)}
					<form method="POST" use:enhance class="flex flex-col gap-4" novalidate>
						<FormInput
							id="checkout-email"
							name="email"
							label="Email Address"
							type="email"
							autocomplete="email"
							bind:value={$form.email}
							error={firstError($errors.email)}
							placeholder="john@example.com"
						/>

						{@render stepTitle('Shipping Address', `${stepHeading} mt-8`)}

						<div class="grid grid-cols-2 gap-4">
							<FormInput
								id="checkout-first-name"
								name="firstName"
								label="First Name"
								autocomplete="given-name"
								bind:value={$form.firstName}
								error={firstError($errors.firstName)}
							/>
							<FormInput
								id="checkout-last-name"
								name="lastName"
								label="Last Name"
								autocomplete="family-name"
								bind:value={$form.lastName}
								error={firstError($errors.lastName)}
							/>
						</div>

						<FormInput
							id="checkout-address"
							name="address"
							label="Address"
							autocomplete="address-line1"
							bind:value={$form.address}
							error={firstError($errors.address)}
						/>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<FormInput
								id="checkout-city"
								name="city"
								label="City"
								autocomplete="address-level2"
								bind:value={$form.city}
								error={firstError($errors.city)}
							/>
							<FormInput
								id="checkout-state"
								name="state"
								label="State / Province"
								autocomplete="address-level1"
								bind:value={$form.state}
								error={firstError($errors.state)}
							/>
							<FormInput
								id="checkout-zip"
								name="zip"
								label="Zip Code"
								autocomplete="postal-code"
								bind:value={$form.zip}
								error={firstError($errors.zip)}
							/>
							<FormSelect
								id="checkout-country"
								label="Country"
								bind:value={$form.country}
								options={countries}
								hideLabel={true}
							/>
						</div>

						{@render continueSubmitButton('mt-8 w-full')}
					</form>
				</div>

				<!-- Step 2: Shipping -->
			{:else if step === 2}
				<div in:fly={stepPanelTransition}>
					{@render stepTitle('Shipping Method', stepHeading)}

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
							{@render stepBackButton('Back', 1, 'flex-1')}
							{@render continueSubmitButton('flex-[2]')}
						</div>
					</form>
				</div>

				<!-- Step 3: Payment -->
			{:else if step === 3}
				<div in:fly={stepPanelTransition}>
					{@render stepTitle('Payment', stepHeading)}
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
							{@render loadingSpinnerIcon()}
							<span>Processing...</span>
						{:else}
							Pay Now {formatMoney(getPayNowDisplayTotal())}
						{/if}
					</Button>
					{@render stepBackTextButton(
						'Back to Shipping',
						2,
						`mt-4 text-xs underline ${COLORS.text} uppercase tracking-widest font-bold cursor-pointer`
					)}
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
						<OrderItemThumbnail
							src={item.image || ''}
							alt={item.title || 'Product Image'}
							quantityBadge={item.quantity}
						/>
						<LineItemMeta
							title={item.title || ''}
							color={item.color || ''}
							size={item.size || ''}
							price={formatMoney(item.price || 0)}
							titleTag="h4"
							wrapperClass="flex-1 flex justify-between items-center gap-4"
							titleClass="text-xs font-bold uppercase tracking-wide"
							detailsClass={`text-[10px] ${COLORS.text} uppercase tracking-wider`}
							priceClass="text-xs font-bold"
						/>
					</div>
				{/each}
				{#if cart.items.length === 0}
					<p class="text-xs opacity-50 text-center py-4">Your cart is empty</p>
				{/if}
			</div>

			{@render orderSummaryDivider()}

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

				{@render summaryRow('Subtotal', formatMoney(pricing?.subtotal ?? cart.subtotal))}

				{#if discount > 0}
					<div in:fly={{ x: 10, duration: 400, easing: cubicOut }}>
						{@render summaryRow('Discount', `-${formatMoney(discount)}`, true)}
					</div>
				{/if}

				{@render summaryRow('Shipping', getShippingDisplayLabel())}

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

			{@render orderSummaryDivider()}

			<div class="flex justify-between items-center">
				<span class="text-sm font-bold uppercase tracking-widest">Total</span>
				<div class="flex items-baseline gap-2">
					<span class="text-xs {COLORS.text} font-bold">{cart.currencyCode}</span>
					{#key discount}
						<span
							class="text-xl font-display font-medium inline-block"
							in:fly={{ y: -10, duration: 400, easing: cubicOut }}
						>
							{formatMoney(getSummaryDisplayTotal())}
						</span>
					{/key}
				</div>
			</div>
		</div>
	</div>
</div>
