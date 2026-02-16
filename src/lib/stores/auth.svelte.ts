import { browser } from '$app/environment';
import {
	pb,
	login as pbLogin,
	loginWithGoogle as pbLoginWithGoogle,
	logout as pbLogout,
	register as pbRegister,
	getCurrentUser,
	isAuthenticated as pbIsAuthenticated,
	requestPasswordReset as pbRequestPasswordReset,
	type PBUser
} from '$lib/pocketbase';

// =============================================================================
// Auth Store - PocketBase Integration
// =============================================================================
// This store manages authentication state using PocketBase SDK.
// It syncs with PocketBase's authStore and provides a reactive interface.

export interface AuthUser {
	id: string;
	email: string;
	name?: string;
	avatar?: string;
	verified: boolean;
	stripeCustomerId?: string;
	isAdmin?: boolean;
}

interface AuthState {
	isLoading: boolean;
	error: string | null;
}

function mapPBUserToAuthUser(pbUser: PBUser | null): AuthUser | null {
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

function createAuthStore() {
	// Initialize from PocketBase authStore
	let initialUser: AuthUser | null = null;
	let initialAuth = false;

	if (browser) {
		initialAuth = pbIsAuthenticated();
		initialUser = mapPBUserToAuthUser(getCurrentUser());
	}

	let isAuthenticated = $state(initialAuth);
	let user = $state<AuthUser | null>(initialUser);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Subscribe to PocketBase auth changes (browser only)
	if (browser) {
		pb.authStore.onChange((token, model) => {
			isAuthenticated = pb.authStore.isValid;
			// Use getCurrentUser() to handle Admin model normalization
			user = mapPBUserToAuthUser(getCurrentUser());
		});
	}

	return {
		// Getters
		get isAuthenticated() {
			return isAuthenticated;
		},
		get user() {
			return user;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},

		// Helper: Check if user passes verification requirements
		_enforceVerification(authUser: AuthUser | null): boolean {
			if (!authUser?.verified && !authUser?.isAdmin) {
				pbLogout();
				error = 'Please verify your email address before logging in.';
				isLoading = false;
				return false;
			}
			return true;
		},

		// Actions
		async login(email: string, password: string): Promise<boolean> {
			isLoading = true;
			error = null;

			try {
				const pbUser = await pbLogin(email, password);
				const authUser = mapPBUserToAuthUser(pbUser);

				if (!this._enforceVerification(authUser)) {
					return false;
				}

				user = authUser;
				isAuthenticated = true;
				isLoading = false;
				return true;
			} catch (e: any) {
				console.error('Login failed:', e);
				error = e.message || 'Login failed. Please check your credentials.';
				isLoading = false;
				return false;
			}
		},

		async loginWithGoogle(): Promise<boolean> {
			isLoading = true;
			error = null;

			// Detection for popup closure:
			// When user closes the popup, the main window regains focus.
			// If we regain focus and after a short delay we assume user cancelled.
			const handleFocus = () => {
				setTimeout(() => {
					if (isLoading && !isAuthenticated) {
						isLoading = false;
						error = null; // Detect as cancellation
						cleanup();
					}
				}, 1000); // Wait 1s to allow any success message/redirect to process first
			};

			const cleanup = () => {
				if (browser) window.removeEventListener('focus', handleFocus);
			};

			if (browser) window.addEventListener('focus', handleFocus);

			try {
				await pbLoginWithGoogle();

				// Check verification status after OAuth login
				const currentUser = getCurrentUser();
				const authUser = mapPBUserToAuthUser(currentUser);

				if (!this._enforceVerification(authUser)) {
					cleanup();
					return false;
				}

				// Auth state change will be handled by the subscription for success case
				isLoading = false;
				cleanup();
				return true;
			} catch (e: any) {
				console.error('Google login failed:', e);
				cleanup();

				// Handle specific cancelation or popup blocked errors
				if (e.isAbort || e.message?.includes('timed out')) {
					error = null; // User cancelled, no error needed
				} else {
					error = e.message || 'Google login failed.';
				}
				isLoading = false;
				return false;
			}
		},

		async register(email: string, password: string, name?: string): Promise<boolean> {
			isLoading = true;
			error = null;

			try {
				const pbUser = await pbRegister(email, password, password, name);
				// User is created but NOT logged in yet.
				// Verification email has been sent.
				isLoading = false;
				return true;
			} catch (e: any) {
				console.error('Registration failed:', e);
				// Parse PocketBase error messages
				if (e.data?.data) {
					const errors = e.data.data;
					if (errors.email?.message) {
						error = errors.email.message;
					} else if (errors.password?.message) {
						error = errors.password.message;
					} else {
						error = 'Registration failed. Please try again.';
					}
				} else {
					error = e.message || 'Registration failed. Please try again.';
				}
				isLoading = false;
				return false;
			}
		},

		async resetPassword(email: string): Promise<boolean> {
			isLoading = true;
			error = null;

			try {
				await pbRequestPasswordReset(email);
				isLoading = false;
				return true;
			} catch (e: any) {
				console.error('Password reset failed:', e);
				error = e.message || 'Failed to send password reset email.';
				isLoading = false;
				return false;
			}
		},

		logout() {
			pbLogout();
			isAuthenticated = false;
			user = null;
			error = null;
		},

		clearError() {
			error = null;
		}
	};
}

export const auth = createAuthStore();
