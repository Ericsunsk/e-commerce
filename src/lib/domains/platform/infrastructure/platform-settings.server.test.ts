import { describe, it, expect, vi } from 'vitest';
import {
	getSmtpSettingsWithClient,
	saveSmtpSettingsWithClient,
	sendSmtpTestEmailWithClient
} from './platform-settings.server';

function fakePb(state: {
	smtp?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	testEmail?: 'ok' | 'fail';
}) {
	return {
		settings: {
			getAll: vi.fn().mockResolvedValue({ smtp: state.smtp ?? {}, meta: state.meta ?? {} }),
			update: vi.fn().mockImplementation(async (patch: Record<string, unknown>) => {
				Object.assign(state.smtp ?? {}, (patch.smtp ?? {}) as object);
				return patch;
			}),
			testEmail: vi.fn().mockImplementation(async () => {
				if (state.testEmail === 'fail') throw new Error('SMTP connect failed');
				return true;
			})
		}
	};
}

describe('smtp persistence seams', () => {
	it('reads settings with safe defaults', async () => {
		const pb = fakePb({});
		expect(await getSmtpSettingsWithClient(pb as never)).toMatchObject({
			host: '',
			port: 587,
			authMethod: 'LOGIN',
			tls: true,
			enabled: false
		});
	});

	it('merges partial saves over stored values without wiping the password', async () => {
		const pb = fakePb({
			smtp: { host: 'old.com', password: 'keep-me', enabled: false }
		});
		const next = await saveSmtpSettingsWithClient(pb as never, { host: 'new.com' });
		expect(next.host).toBe('new.com');
		expect(next.password).toBe('keep-me');
		expect(pb.settings.update).toHaveBeenCalledWith(
			expect.objectContaining({
				smtp: expect.objectContaining({ host: 'new.com', password: 'keep-me' })
			})
		);
	});

	it('overwrites the password only when supplied', async () => {
		const pb = fakePb({ smtp: { password: 'old' } });
		await saveSmtpSettingsWithClient(pb as never, { password: 'new-secret' });
		expect(pb.settings.update).toHaveBeenCalledWith(
			expect.objectContaining({ smtp: expect.objectContaining({ password: 'new-secret' }) })
		);
	});

	it('sends template test emails and surfaces failures', async () => {
		expect(await sendSmtpTestEmailWithClient(fakePb({}) as never, { toEmail: 'a@b.com' })).toMatchObject(
			{ ok: true }
		);
		expect(
			await sendSmtpTestEmailWithClient(fakePb({ testEmail: 'fail' }) as never, {
				toEmail: 'a@b.com',
				template: 'password-reset'
			})
		).toMatchObject({ ok: false });
	});
});
