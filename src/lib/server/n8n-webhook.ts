import { env as privateEnv } from '$env/dynamic/private';

export function assertN8nWebhookAuthorized(request: Request) {
	const expectedSecret = privateEnv.N8N_WEBHOOK_SECRET?.trim();
	if (!expectedSecret) {
		throw { status: 500, message: 'N8N_WEBHOOK_SECRET is not configured' };
	}

	const providedSecret = request.headers.get('X-Webhook-Secret');
	if (providedSecret !== expectedSecret) {
		throw { status: 401, message: 'Unauthorized' };
	}
}
