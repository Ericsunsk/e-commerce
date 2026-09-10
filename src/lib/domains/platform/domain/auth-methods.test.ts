import { describe, it, expect } from 'vitest';
import { toAuthMethodsView } from './auth-methods';

describe('auth methods view', () => {
	it('projects switches and masks client ids', () => {
		const view = toAuthMethodsView({
			passwordAuth: { enabled: true },
			mfa: { enabled: false },
			otp: { enabled: false },
			oauth2: {
				enabled: true,
				providers: [{ name: 'google', displayName: '', clientId: '968297082167-abc123xyz' }]
			}
		});
		expect(view).toMatchObject({
			passwordEnabled: true,
			mfaEnabled: false,
			otpEnabled: false,
			oauthEnabled: true
		});
		expect(view.providers).toHaveLength(1);
		expect(view.providers[0]).toMatchObject({ name: 'google', enabled: true });
		expect(view.providers[0].clientIdMasked).toContain('...');
		expect(view.providers[0].clientIdMasked).not.toContain('abc123xyz');
	});

	it('marks providers without client ids as unconfigured', () => {
		const view = toAuthMethodsView({
			oauth2: { enabled: true, providers: [{ name: 'github' }] }
		});
		expect(view.providers[0]).toMatchObject({ enabled: false, clientIdMasked: '未配置' });
	});

	it('tolerates missing sections', () => {
		expect(toAuthMethodsView({})).toMatchObject({
			passwordEnabled: false,
			oauthEnabled: false,
			providers: []
		});
	});
});
