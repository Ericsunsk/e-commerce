import {
	loginWithPassword,
	loginWithOAuthGoogle,
	registerAccount,
	requestPasswordResetEmail,
	logoutAccount,
	getCurrentPBUser,
	mapPBUserToAuthUser
} from '../infrastructure/auth-client';
import type { AuthUser } from '../domain/models';

export async function loginUser(email: string, password: string): Promise<AuthUser | null> {
	const pbUser = await loginWithPassword(email, password);
	return mapPBUserToAuthUser(pbUser);
}

export async function loginWithGoogle(): Promise<void> {
	await loginWithOAuthGoogle();
}

export async function registerUser(email: string, password: string, name?: string): Promise<AuthUser | null> {
	const pbUser = await registerAccount(email, password, name);
	return mapPBUserToAuthUser(pbUser);
}

export async function resetUserPassword(email: string): Promise<boolean> {
	return requestPasswordResetEmail(email);
}

export function logoutUser(): void {
	logoutAccount();
}

export function getActiveUser(): AuthUser | null {
	return mapPBUserToAuthUser(getCurrentPBUser());
}
