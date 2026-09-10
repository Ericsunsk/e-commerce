import { describe, it, expect } from 'vitest';
import { normalizeEmailTemplate, toTemplateContent, EMAIL_TEMPLATES } from './email-templates';

describe('email templates', () => {
	it('lists the three transactional templates', () => {
		expect(EMAIL_TEMPLATES.map((t) => t.key)).toEqual([
			'verification',
			'password-reset',
			'email-change'
		]);
	});

	it('validates subject/body bounds and blocks scripts', () => {
		expect(
			normalizeEmailTemplate({ subject: 'Hi', body: 'Hello world, click link' })
		).toMatchObject({ subject: 'Hi', actionUrl: '' });
		for (const bad of [
			null,
			{ subject: 'x', body: 'Hello world!' },
			{ subject: 'Hi', body: 'short' },
			{ subject: 'Hi', body: 'Hello <script>alert(1)</script> world' }
		]) {
			try {
				normalizeEmailTemplate(bad);
				expect.unreachable();
			} catch (err) {
				expect(err).toMatchObject({ status: 400 });
			}
		}
	});

	it('projects missing templates as empty drafts', () => {
		expect(toTemplateContent(undefined)).toEqual({ subject: '', body: '', actionUrl: '' });
	});
});
