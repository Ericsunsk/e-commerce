import { error } from '@sveltejs/kit';
import { getEmailTemplates, saveEmailTemplate } from '$domains/platform/server';
import type { EmailTemplateKey } from '$domains/platform/server';
import { apiHandler, parseAndNormalizeJsonBody } from '$shared/infrastructure/server';

const KEYS = ['verification', 'password-reset', 'email-change'] as const;

export const GET = apiHandler(
	async () => {
		return { success: true, templates: await getEmailTemplates() };
	},
	{ admin: true }
);

export const PUT = apiHandler(
	async ({ request }) => {
		const body = await parseAndNormalizeJsonBody(
			request,
			(input) => input as Record<string, unknown>
		);

		const key = body.key as EmailTemplateKey;
		if (!(KEYS as readonly string[]).includes(key)) {
			throw error(400, '仅支持 verification / password-reset / email-change');
		}

		return { success: true, template: await saveEmailTemplate(key, body.template) };
	},
	{ admin: true }
);
