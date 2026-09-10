import { describe, it, expect } from 'vitest';
import { normalizeSmtpSettings, toMaskedSmtp, normalizeSmtpTest } from './smtp-settings';

describe('smtp settings', () => {
	it('accepts partial saves with bounds', () => {
		expect(normalizeSmtpSettings({})).toEqual({});
		expect(
			normalizeSmtpSettings({
				host: 'smtp.example.com',
				port: 587,
				username: 'bot',
				password: 'secret',
				authMethod: 'LOGIN',
				tls: true,
				enabled: true,
				fromAddress: 'noreply@example.com',
				fromName: 'Shop'
			})
		).toMatchObject({ host: 'smtp.example.com', port: 587, authMethod: 'LOGIN' });

		for (const bad of [
			null,
			{ host: 'not a host!!' },
			{ port: 0 },
			{ port: 99999 },
			{ authMethod: 'CRAM' },
			{ enabled: 'yes' },
			{ fromAddress: 'not-an-email' },
			{ enabled: true, host: '' }
		]) {
			try {
				normalizeSmtpSettings(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('masks the password behind a flag', () => {
		const masked = toMaskedSmtp({
			host: 'h',
			port: 587,
			username: 'u',
			password: 'secret',
			authMethod: 'LOGIN',
			tls: true,
			enabled: true,
			fromAddress: '',
			fromName: ''
		});
		expect(masked.hasPassword).toBe(true);
		expect(JSON.stringify(masked)).not.toContain('secret');
		expect('password' in masked).toBe(false);
	});

	it('validates test-email requests', () => {
		expect(normalizeSmtpTest({ toEmail: 'a@b.com' })).toEqual({
			toEmail: 'a@b.com',
			template: 'verification'
		});
		expect(normalizeSmtpTest({ toEmail: 'a@b.com', template: 'password-reset' })).toMatchObject({
			template: 'password-reset'
		});
		for (const bad of [null, {}, { toEmail: 'nope' }, { toEmail: 'a@b.com', template: 'x' }]) {
			try {
				normalizeSmtpTest(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});
});
