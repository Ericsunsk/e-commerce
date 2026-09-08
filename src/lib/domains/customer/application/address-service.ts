import {
	fetchUserAddresses,
	createUserAddress,
	updateUserAddress,
	deleteUserAddress,
	setDefaultShippingAddress
} from '../infrastructure/address-client';
import type { UserAddress } from '../domain/models';

export async function listAddresses(userId: string): Promise<UserAddress[]> {
	return fetchUserAddresses(userId);
}

export async function saveAddress(
	userId: string,
	address: {
		id?: string;
		label?: string;
		recipientName: string;
		phone?: string;
		line1: string;
		line2?: string;
		city: string;
		state?: string;
		postalCode: string;
		country: string;
		isDefault?: boolean;
	}
): Promise<string> {
	const payload = {
		user: userId,
		label: address.label,
		recipient_name: address.recipientName,
		phone: address.phone,
		line1: address.line1,
		line2: address.line2,
		city: address.city,
		state: address.state,
		postal_code: address.postalCode,
		country: address.country
	};

	let savedId: string;
	if (address.id) {
		await updateUserAddress(address.id, payload);
		savedId = address.id;
	} else {
		savedId = await createUserAddress(payload);
	}

	if (address.isDefault) {
		await setDefaultShippingAddress(userId, savedId);
	}

	return savedId;
}

export async function removeAddress(
	userId: string,
	addressId: string,
	wasDefault?: boolean
): Promise<void> {
	await deleteUserAddress(addressId);
	if (wasDefault) {
		await setDefaultShippingAddress(userId, null);
	}
}

export async function makeAddressDefault(userId: string, addressId: string): Promise<void> {
	await setDefaultShippingAddress(userId, addressId);
}
