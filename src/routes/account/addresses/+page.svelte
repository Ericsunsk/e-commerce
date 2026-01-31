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
	import { LAYOUT, BUTTON_STYLES, COLORS } from '$lib/constants';

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

	// Redirect if not logged in
	$effect(() => {
		if (!isLoggedIn) {
			goto('/account?redirect=/account/addresses');
		}
	});

	onMount(async () => {
		await loadAddresses();
	});

	async function loadAddresses() {
		if (!isLoggedIn || !currentUser) return;

		isLoading = true;
		try {
			// Fetch addresses and refreshing user data to get latest default_shipping_address
			const [addressRecords, userRecord] = await Promise.all([
				pb.collection(Collections.UserAddresses).getFullList({
					filter: `user="${currentUser.id}"`,
					sort: '-created'
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

			if (editingAddress) {
				// Update existing
				await pb.collection('user_addresses').update(editingAddress.id, addressData);
				savedAddressId = editingAddress.id;
				toastStore.show(MESSAGES.SUCCESS.ADDRESS_UPDATED, 'success');
			} else {
				// Create new
				const record = await pb.collection('user_addresses').create(addressData);
				savedAddressId = record.id;
				toastStore.show(MESSAGES.SUCCESS.ADDRESS_ADDED, 'success');
			}

			// Handle default address setting via User relation
			if (isDefault) {
				await pb.collection(Collections.Users).update(currentUser.id, {
					default_shipping_address: savedAddressId
				});
			} else if (editingAddress && editingAddress.isDefault && !isDefault) {
				// If it was default but now unchecked, clear the default
				await pb.collection(Collections.Users).update(currentUser.id, {
					default_shipping_address: null
				});
			}

			isEditing = false;
			resetForm();
			await loadAddresses();
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
				await pb.collection(Collections.Users).update(currentUser.id, {
					default_shipping_address: null
				});
			}

			toastStore.show(MESSAGES.SUCCESS.ADDRESS_DELETED, 'success');
			await loadAddresses();
		} catch (e) {
			console.error('Failed to delete address:', e);
			toastStore.show(MESSAGES.ERROR.FAILED_TO_DELETE_ADDRESS, 'error');
		}
	}

	async function setAsDefault(id: string) {
		if (!currentUser) return;
		try {
			// Update User collection directly
			await pb.collection(Collections.Users).update(currentUser.id, {
				default_shipping_address: id
			});

			toastStore.show(MESSAGES.SUCCESS.DEFAULT_ADDRESS_UPDATED, 'success');
			await loadAddresses();
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
						<div>
							<label for="addr-label" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
								>Label (Optional)</label
							>
							<input
								type="text"
								id="addr-label"
								bind:value={label}
								placeholder="Home, Office..."
								class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
							/>
						</div>
						<div>
							<label for="addr-phone" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
								>Phone</label
							>
							<input
								type="tel"
								id="addr-phone"
								bind:value={phone}
								class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
							/>
						</div>
					</div>

					<div>
						<label for="addr-recipient" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
							>Recipient Name *</label
						>
						<input
							type="text"
							id="addr-recipient"
							bind:value={recipientName}
							required
							class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
						/>
					</div>

					<div>
						<label for="addr-line1" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
							>Address Line 1 *</label
						>
						<input
							type="text"
							id="addr-line1"
							bind:value={line1}
							required
							class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
						/>
					</div>

					<div>
						<label for="addr-line2" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
							>Address Line 2</label
						>
						<input
							type="text"
							id="addr-line2"
							bind:value={line2}
							class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="addr-city" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
								>City *</label
							>
							<input
								type="text"
								id="addr-city"
								bind:value={city}
								required
								class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
							/>
						</div>
						<div>
							<label for="addr-state" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
								>State/Province</label
							>
							<input
								type="text"
								id="addr-state"
								bind:value={stateProvince}
								class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="addr-postal" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
								>Postal Code *</label
							>
							<input
								type="text"
								id="addr-postal"
								bind:value={postalCode}
								required
								class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
							/>
						</div>
						<div>
							<label for="addr-country" class="block text-[10px] uppercase tracking-[0.15em] mb-2"
								>Country *</label
							>
							<select
								id="addr-country"
								bind:value={country}
								required
								class="w-full bg-transparent border-b border-primary dark:border-white py-3 text-sm outline-none"
							>
								<option value="US">United States</option>
								<option value="CA">Canada</option>
								<option value="GB">United Kingdom</option>
								<option value="AU">Australia</option>
								<option value="CN">China</option>
								<option value="JP">Japan</option>
							</select>
						</div>
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
				<p class="text-xl font-display uppercase tracking-widest mb-4">No Addresses</p>
				<p class="text-sm {COLORS.textMuted} mb-8">Add your first shipping address.</p>
				<button
					onclick={startNew}
					class="{BUTTON_STYLES.outline} {BUTTON_STYLES.base} {BUTTON_STYLES.sizeLg}"
				>
					Add Address
				</button>
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
							<button
								onclick={() => startEdit(address)}
								class="text-[10px] uppercase tracking-widest hover:underline cursor-pointer"
							>
								Edit
							</button>
							{#if !address.isDefault}
								<button
									onclick={() => setAsDefault(address.id)}
									class="text-[10px] uppercase tracking-widest hover:underline cursor-pointer"
								>
									Set Default
								</button>
							{/if}
							<button
								onclick={() => deleteAddress(address.id)}
								class="text-[10px] uppercase tracking-widest text-red-500 hover:underline cursor-pointer"
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
