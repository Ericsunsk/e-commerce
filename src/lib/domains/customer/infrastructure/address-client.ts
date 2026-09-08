import { pb, Collections } from '$shared/infrastructure';
import type { UserAddress } from '../domain/models';

export async function fetchUserAddresses(userId: string): Promise<UserAddress[]> {
	const [addressRecords, userRecord] = await Promise.all([
		pb.collection(Collections.UserAddresses).getFullList({
			filter: `user="${userId}"`,
			sort: '-id'
		}),
		pb.collection(Collections.Users).getOne(userId)
	]);

	const defaultAddressId = userRecord.default_shipping_address;

	return addressRecords
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
		.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
}

export async function createUserAddress(data: {
	user: string;
	label?: string;
	recipient_name: string;
	phone?: string;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postal_code: string;
	country: string;
}): Promise<string> {
	const record = await pb.collection(Collections.UserAddresses).create(data);
	return record.id;
}

export async function updateUserAddress(
	id: string,
	data: {
		label?: string;
		recipient_name: string;
		phone?: string;
		line1: string;
		line2?: string;
		city: string;
		state?: string;
		postal_code: string;
		country: string;
	}
): Promise<void> {
	await pb.collection(Collections.UserAddresses).update(id, data);
}

export async function deleteUserAddress(id: string): Promise<void> {
	await pb.collection(Collections.UserAddresses).delete(id);
}

export async function setDefaultShippingAddress(
	userId: string,
	addressId: string | null
): Promise<void> {
	await pb.collection(Collections.Users).update(userId, {
		default_shipping_address: addressId
	});
}
