<script lang="ts">
	import { Collections } from '$lib/pocketbase-types';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MESSAGES } from '$lib/messages';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import AccountEmptyState from '$lib/components/account/AccountEmptyState.svelte';
	import AddressFormField from '$lib/components/account/AddressFormField.svelte';
	import { LAYOUT, BUTTON_STYLES } from '$lib/constants';

	// Define local interface for Address with isDefault derived property
	interface AddressWithDefault {
		id: string;
		userId: string;
		label?: string;
		recipientName: string;
		phone?: string;
		line1: string;
		line2?: string;
		city: string;
		state?: string;
		postalCode: string;
		country: string;
		isDefault: boolean;
	}

	let { data } = $props();

	let isLoggedIn = $derived(auth.isAuthenticated);
	let currentUser = $derived(auth.user);
	// Explicitly type the addresses array
	let addresses = $state<AddressWithDefault[]>([]);
	let isLoading = $state(true);
	let isEditing = $state(false);
	let editingAddress = $state<AddressWithDefault | null>(null);

	// Form fields
	let label = $state('');
	let recipientName = $state('');
	let phone = $state('');
	let line1 = $state('');
	let line2 = $state('');
	let city = $state('');
	let stateProvince = $state('');
	let postalCode = $state('');
	let country = $state('US');
	let isDefault = $state(false);

	const countryOptions = [
		{ value: 'US', label: 'United States' },
		{ value: 'CA', label: 'Canada' },
		{ value: 'GB', label: 'United Kingdom' },
		{ value: 'AU', label: 'Australia' },
		{ value: 'CN', label: 'China' },
		{ value: 'JP', label: 'Japan' }
	];
	const addressActionButtonClass =
		'text-[10px] uppercase tracking-widest hover:underline cursor-pointer';
	const addressDeleteActionButtonClass = `${addressActionButtonClass} text-red-500`;

	// Redirect if not logged in
	$effect(() => {
		if (!isLoggedIn) {
			goto('/account?redirect=/account/addresses');
		}
	});

	onMount(async () => {
		await loadAddresses();
	});

	async function updateDefaultShippingAddress(addressId: string | null) {
		if (!currentUser) return;
		await pb.collection(Collections.Users).update(currentUser.id, {
			default_shipping_address: addressId
		});
	}

	async function showSuccessAndReload(message: string) {
		toastStore.show(message, 'success');
		await loadAddresses();
	}

	async function loadAddresses() {
		if (!isLoggedIn || !currentUser) return;

		isLoading = true;
		try {
			// Fetch addresses and refreshing user data to get latest default_shipping_address
			const [addressRecords, userRecord] = await Promise.all([
				pb.collection(Collections.UserAddresses).getFullList({
					filter: `user="${currentUser.id}"`,
					sort: '-id'
				}),
				pb.collection(Collections.Users).getOne(currentUser.id)
			]);

			// Update auth store with latest user data if needed
			// (Optional, but good practice to keep local state in sync)

			const defaultAddressId = userRecord.default_shipping_address;

			addresses = addressRecords
				.map((r) => ({
					id: r.id,
					userId: r.user,
					label: r.label,
					recipientName: r.recipient_name,
					phone: r.phone,
					line1: r.line1,
					line2: r.line2,
					city: r.city,
					state: r.state,
					postalCode: r.postal_code,
					country: r.country,
					isDefault: r.id === defaultAddressId
				}))
				.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)); // Sort default to top
		} catch (e) {
			console.error('Failed to load addresses:', e);
		}
		isLoading = false;
	}

	function resetForm() {
		label = '';
		recipientName = '';
		phone = '';
		line1 = '';
		line2 = '';
		city = '';
		stateProvince = '';
		postalCode = '';
		country = 'US';
		isDefault = false;
		editingAddress = null;
	}

	function startEdit(address: AddressWithDefault) {
		editingAddress = address;
		label = address.label || '';
		recipientName = address.recipientName;
		phone = address.phone || '';
		line1 = address.line1;
		line2 = address.line2 || '';
		city = address.city;
		stateProvince = address.state || '';
		postalCode = address.postalCode;
		country = address.country;
		isDefault = address.isDefault;
		isEditing = true;
	}

	function startNew() {
		resetForm();
		isEditing = true;
	}

	function cancelEdit() {
		resetForm();
		isEditing = false;
	}

	async function saveAddress(e: Event) {
		e.preventDefault();
		if (!currentUser) return;

		const addressData = {
			user: currentUser.id,
			label,
			recipient_name: recipientName,
			phone,
			line1,
			line2,
			city,
			state: stateProvince,
			postal_code: postalCode,
			country
			// is_default removed from backend
		};

		try {
			let savedAddressId: string;
			let successMessage: string = MESSAGES.SUCCESS.ADDRESS_ADDED;

			if (editingAddress) {
				// Update existing
				await pb.collection(Collections.UserAddresses).update(editingAddress.id, addressData);
				savedAddressId = editingAddress.id;
				successMessage = MESSAGES.SUCCESS.ADDRESS_UPDATED;
			} else {
				// Create new
				const record = await pb.collection(Collections.UserAddresses).create(addressData);
				savedAddressId = record.id;
			}

			// Handle default address setting via User relation
			if (isDefault) {
				await updateDefaultShippingAddress(savedAddressId);
			} else if (editingAddress && editingAddress.isDefault && !isDefault) {
				// If it was default but now unchecked, clear the default
				await updateDefaultShippingAddress(null);
			}

			isEditing = false;
			resetForm();
			await showSuccessAndReload(successMessage);
		} catch (e) {
			console.error('Failed to save address:', e);
			toastStore.show(MESSAGES.ERROR.FAILED_TO_SAVE_ADDRESS, 'error');
		}
	}

	async function deleteAddress(id: string) {
		if (!confirm('Are you sure you want to delete this address?')) return;
		if (!currentUser) return;

		try {
			const addressToDelete = addresses.find((a) => a.id === id);

			await pb.collection(Collections.UserAddresses).delete(id);

			// If deleting the default address, clear the user relation
			if (addressToDelete?.isDefault) {
				await updateDefaultShippingAddress(null);
			}

			await showSuccessAndReload(MESSAGES.SUCCESS.ADDRESS_DELETED);
		} catch (e) {
			console.error('Failed to delete address:', e);
			toastStore.show(MESSAGES.ERROR.FAILED_TO_DELETE_ADDRESS, 'error');
		}
	}

	async function setAsDefault(id: string) {
		if (!currentUser) return;
		try {
			// Update User collection directly
			await updateDefaultShippingAddress(id);
			await showSuccessAndReload(MESSAGES.SUCCESS.DEFAULT_ADDRESS_UPDATED);
		} catch (e) {
			console.error('Failed to update default:', e);
			toastStore.show(MESSAGES.ERROR.FAILED_TO_UPDATE_DEFAULT, 'error');
		}
	}
</script>

<svelte:head>
	<title>Address Book | {data.settings.siteName}</title>
</svelte:head>

<div class={LAYOUT.pageContainer}>
	<div class={LAYOUT.contentWrapper}>
		<PageHeader title="Address Book" backLabel="Back to Account" backHref="/account">
			{#snippet actions()}
				{#if !isEditing}
					<button
						onclick={startNew}
						class="{BUTTON_STYLES.outline} {BUTTON_STYLES.base} {BUTTON_STYLES.sizeSm}"
					>
						Add New
					</button>
				{/if}
			{/snippet}
		</PageHeader>

		{#if isEditing}
			<!-- Edit Form -->
			<div class="max-w-lg" in:fade>
				<h2 class="text-xl font-display uppercase tracking-widest mb-8">
					{editingAddress ? 'Edit Address' : 'New Address'}
				</h2>
				<form onsubmit={saveAddress} class="space-y-6">
					<div class="grid grid-cols-2 gap-4">
						<AddressFormField
							id="addr-label"
							label="Label (Optional)"
							bind:value={label}
							placeholder="Home, Office..."
						/>
						<AddressFormField id="addr-phone" type="tel" label="Phone" bind:value={phone} />
					</div>

					<AddressFormField
						id="addr-recipient"
						label="Recipient Name"
						required
						bind:value={recipientName}
					/>

					<AddressFormField id="addr-line1" label="Address Line 1" required bind:value={line1} />

					<AddressFormField id="addr-line2" label="Address Line 2" bind:value={line2} />

					<div class="grid grid-cols-2 gap-4">
						<AddressFormField id="addr-city" label="City" required bind:value={city} />
						<AddressFormField id="addr-state" label="State/Province" bind:value={stateProvince} />
					</div>

					<div class="grid grid-cols-2 gap-4">
						<AddressFormField
							id="addr-postal"
							label="Postal Code"
							required
							bind:value={postalCode}
						/>
						<AddressFormField
							id="addr-country"
							label="Country"
							required
							bind:value={country}
							options={countryOptions}
						/>
					</div>

					<label class="flex items-center gap-3 cursor-pointer">
						<input type="checkbox" bind:checked={isDefault} class="w-4 h-4" />
						<span class="text-[10px] uppercase tracking-[0.15em]">Set as default address</span>
					</label>

					<div class="flex gap-4 pt-6">
						<button
							type="submit"
							class="flex-1 bg-primary text-white dark:bg-white dark:text-primary py-4 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer"
						>
							Save Address
						</button>
						<button
							type="button"
							onclick={cancelEdit}
							class="px-8 py-4 border border-primary dark:border-white text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all cursor-pointer"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{:else if isLoading}
			<LoadingState message="Loading addresses..." />
		{:else if addresses.length === 0}
			<div class={LAYOUT.emptyState}>
				<AccountEmptyState
					title="No Addresses"
					description="Add your first shipping address."
					actionLabel="Add Address"
					onAction={startNew}
					actionVariant="outline"
				/>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each addresses as address (address.id)}
					<div
						class="border border-primary/10 dark:border-white/10 p-6 relative {address.isDefault
							? 'border-primary dark:border-white'
							: ''}"
						in:fade={{ duration: 300 }}
					>
						{#if address.isDefault}
							<span
								class="absolute top-4 right-4 text-[8px] uppercase tracking-widest bg-primary dark:bg-white text-white dark:text-primary px-2 py-1"
							>
								Default
							</span>
						{/if}

						{#if address.label}
							<p
								class="text-[10px] uppercase tracking-[0.15em] text-primary/60 dark:text-white/60 mb-2"
							>
								{address.label}
							</p>
						{/if}

						<p class="font-medium mb-2">{address.recipientName}</p>
						<p class="text-sm text-primary/80 dark:text-white/80">
							{address.line1}<br />
							{#if address.line2}{address.line2}<br />{/if}
							{address.city}, {address.state}
							{address.postalCode}<br />
							{address.country}
						</p>
						{#if address.phone}
							<p class="text-sm text-primary/60 dark:text-white/60 mt-2">
								{address.phone}
							</p>
						{/if}

						<div class="flex gap-4 mt-6 pt-4 border-t border-primary/10 dark:border-white/10">
							<button onclick={() => startEdit(address)} class={addressActionButtonClass}>
								Edit
							</button>
							{#if !address.isDefault}
								<button onclick={() => setAsDefault(address.id)} class={addressActionButtonClass}>
									Set Default
								</button>
							{/if}
							<button
								onclick={() => deleteAddress(address.id)}
								class={addressDeleteActionButtonClass}
							>
								Delete
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
