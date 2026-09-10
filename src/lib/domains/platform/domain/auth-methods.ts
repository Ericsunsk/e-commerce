/**
 * Auth methods status (pure domain).
 *
 * Projects the `users` collection auth configuration into a client-safe
 * status view. Client secrets are never exposed — only presence flags and
 * masked client IDs.
 */

import { maskIdentifier } from '$shared/kernel';

export interface OAuthProviderView {
	name: string;
	displayName: string;
	enabled: boolean;
	clientIdMasked: string;
}

export interface AuthMethodsView {
	passwordEnabled: boolean;
	mfaEnabled: boolean;
	otpEnabled: boolean;
	oauthEnabled: boolean;
	providers: OAuthProviderView[];
}

/** Pure projection of the raw `users` collection auth config. */
export function toAuthMethodsView(raw: {
	passwordAuth?: { enabled?: boolean };
	mfa?: { enabled?: boolean };
	otp?: { enabled?: boolean };
	oauth2?: {
		enabled?: boolean;
		providers?: Array<{ name?: string; displayName?: string; clientId?: string }>;
	};
}): AuthMethodsView {
	const providers = (raw.oauth2?.providers ?? []).map((provider) => ({
		name: provider.name || 'unknown',
		displayName: provider.displayName || provider.name || 'unknown',
		enabled: (raw.oauth2?.enabled === true) && Boolean(provider.clientId),
		clientIdMasked: maskIdentifier(provider.clientId) || '未配置'
	}));
	return {
		passwordEnabled: raw.passwordAuth?.enabled === true,
		mfaEnabled: raw.mfa?.enabled === true,
		otpEnabled: raw.otp?.enabled === true,
		oauthEnabled: raw.oauth2?.enabled === true,
		providers
	};
}
