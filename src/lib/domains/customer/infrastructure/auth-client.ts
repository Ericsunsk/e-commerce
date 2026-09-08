import { pb, Collections } from '$shared/infrastructure';
import type { AuthUser } from '../domain/models';

export interface PBUser {
	id: string;
	email: string;
	name?: string;
	username?: string;
	avatar?: string;
	verified: boolean;
	created: string;
	updated: string;
	display_name?: string;
	phone?: string;
	stripe_customer_id?: string;
	isAdmin?: boolean;
}

export function mapPBUserToAuthUser(pbUser: PBUser | null): AuthUser | null {
	if (!pbUser) return null;
	return {
		id: pbUser.id,
		email: pbUser.email,
		name: pbUser.display_name || pbUser.name,
		avatar: pbUser.avatar,
		verified: pbUser.verified,
		stripeCustomerId: pbUser.stripe_customer_id,
		isAdmin: pbUser.isAdmin
	};
}

function createAdminUser(model: unknown): PBUser {
	const m = model as unknown as Record<string, unknown> | null | undefined;
	return {
		id: typeof m?.id === 'string' ? m.id : '',
		email: typeof m?.email === 'string' ? m.email : '',
		name: 'Admin',
		username: 'admin',
		avatar: m?.avatar != null ? String(m.avatar) : undefined,
		verified: true,
		created: typeof m?.created === 'string' ? m.created : '',
		updated: typeof m?.updated === 'string' ? m.updated : '',
		display_name: 'Administrator',
		isAdmin: true
	};
}

export function isClientAuthenticated(): boolean {
	return pb.authStore.isValid;
}

export function getCurrentPBUser(): PBUser | null {
	if (!pb.authStore.isValid) return null;
	if (pb.authStore.isSuperuser) {
		return createAdminUser(pb.authStore.record);
	}
	return pb.authStore.record as unknown as PBUser;
}

export async function loginWithPassword(email: string, password: string): Promise<PBUser> {
	try {
		const authData = await pb.collection(Collections.Users).authWithPassword(email, password);
		return authData.record as unknown as PBUser;
	} catch (err) {
		try {
			const authData = await pb.admins.authWithPassword(email, password);
			const admin = (authData as { admin?: unknown }).admin;
			return createAdminUser(
				admin && typeof admin === 'object' ? (admin as Record<string, unknown>) : undefined
			);
		} catch {
			throw err;
		}
	}
}

export async function loginWithOAuthGoogle(): Promise<void> {
	await pb.collection(Collections.Users).authWithOAuth2({ provider: 'google' });
}

export async function registerAccount(
	email: string,
	password: string,
	name?: string
): Promise<PBUser> {
	const data = {
		email,
		password,
		passwordConfirm: password,
		display_name: name || email.split('@')[0],
		name: name || email.split('@')[0]
	};

	const user = await pb.collection(Collections.Users).create<PBUser>(data);
	await pb.collection(Collections.Users).requestVerification(email);
	return user;
}

export async function requestPasswordResetEmail(email: string): Promise<boolean> {
	await pb.collection(Collections.Users).requestPasswordReset(email);
	return true;
}

export function logoutAccount(): void {
	pb.authStore.clear();
}
