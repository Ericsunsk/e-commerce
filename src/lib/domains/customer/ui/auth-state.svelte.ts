import { browser } from '$app/environment';
import { pb } from '$shared/infrastructure';
import {
	isClientAuthenticated,
	getCurrentPBUser,
	mapPBUserToAuthUser,
	loginWithPassword,
	loginWithOAuthGoogle,
	registerAccount,
	requestPasswordResetEmail,
	logoutAccount
} from '../infrastructure/auth-client';
import type { AuthUser } from '../domain/models';

export class AuthStore {
	isAuthenticated = $state(false);
	user = $state<AuthUser | null>(null);
	isLoading = $state(false);
	error = $state<string | null>(null);

	constructor() {
		if (browser) {
			this.isAuthenticated = isClientAuthenticated();
			this.user = mapPBUserToAuthUser(getCurrentPBUser());

			pb.authStore.onChange(() => {
				this.isAuthenticated = pb.authStore.isValid;
				this.user = mapPBUserToAuthUser(getCurrentPBUser());
			});
		}
	}

	private enforceVerification(authUser: AuthUser | null): boolean {
		if (!authUser?.verified && !authUser?.isAdmin) {
			logoutAccount();
			this.error = 'Please verify your email address before logging in.';
			this.isLoading = false;
			return false;
		}
		return true;
	}

	async login(email: string, password: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			const pbUser = await loginWithPassword(email, password);
			const authUser = mapPBUserToAuthUser(pbUser);

			if (!this.enforceVerification(authUser)) {
				return false;
			}

			this.user = authUser;
			this.isAuthenticated = true;
			this.isLoading = false;
			return true;
		} catch (e: any) {
			console.error('Login failed:', e);
			this.error = e.message || 'Login failed. Please check your credentials.';
			this.isLoading = false;
			return false;
		}
	}

	async loginWithGoogle(): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		const handleFocus = () => {
			setTimeout(() => {
				if (this.isLoading && !this.isAuthenticated) {
					this.isLoading = false;
					this.error = null;
					cleanup();
				}
			}, 1000);
		};

		const cleanup = () => {
			if (browser) window.removeEventListener('focus', handleFocus);
		};

		if (browser) window.addEventListener('focus', handleFocus);

		try {
			await loginWithOAuthGoogle();

			const currentUser = getCurrentPBUser();
			const authUser = mapPBUserToAuthUser(currentUser);

			if (!this.enforceVerification(authUser)) {
				cleanup();
				return false;
			}

			this.isLoading = false;
			cleanup();
			return true;
		} catch (e: any) {
			console.error('Google login failed:', e);
			cleanup();

			if (e.isAbort || e.message?.includes('timed out')) {
				this.error = null;
			} else {
				this.error = e.message || 'Google login failed.';
			}
			this.isLoading = false;
			return false;
		}
	}

	async register(email: string, password: string, name?: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			await registerAccount(email, password, name);
			this.isLoading = false;
			return true;
		} catch (e: any) {
			console.error('Registration failed:', e);
			if (e.data?.data) {
				const errors = e.data.data;
				if (errors.email?.message) {
					this.error = errors.email.message;
				} else if (errors.password?.message) {
					this.error = errors.password.message;
				} else {
					this.error = 'Registration failed. Please try again.';
				}
			} else {
				this.error = e.message || 'Registration failed. Please try again.';
			}
			this.isLoading = false;
			return false;
		}
	}

	async resetPassword(email: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			await requestPasswordResetEmail(email);
			this.isLoading = false;
			return true;
		} catch (e: any) {
			console.error('Password reset failed:', e);
			this.error = e.message || 'Failed to send password reset email.';
			this.isLoading = false;
			return false;
		}
	}

	logout(): void {
		logoutAccount();
		this.isAuthenticated = false;
		this.user = null;
		this.error = null;
	}

	clearError(): void {
		this.error = null;
	}
}

export const auth = new AuthStore();
