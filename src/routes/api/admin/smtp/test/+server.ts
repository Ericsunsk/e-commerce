import { sendSmtpTestEmail } from '$domains/platform/server';
import { apiHandler } from '$shared/infrastructure/server';

/** Send a template test email via the stored SMTP settings. */
export const POST = apiHandler(
	async ({ request }) => {
		// Empty body is meaningful: validation will complain about the missing
		// address. Do not 400 here — see payment/test for the same reasoning.
		let body: unknown = {};
		try {
			body = await request.json();
		} catch {
			// Empty body → validation will complain about the missing address.
		}

		const result = await sendSmtpTestEmail(body);
		return { success: true, ...result };
	},
	{ admin: true }
);
