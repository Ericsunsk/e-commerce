import { z } from 'zod';
import { PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, STRIPE_SECRET_KEY } from '$env/static/private';

const envSchema = z.object({
	PB_ADMIN_EMAIL: z.string().email('PB_ADMIN_EMAIL must be a valid email'),
	PB_ADMIN_PASSWORD: z.string().min(1, 'PB_ADMIN_PASSWORD is required'),
	STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required')
	// ⚠️ STRIPE_WEBHOOK_SECRET 和 N8N_WEBHOOK_URL 已移除
	// Webhook 现由 n8n 直接处理
});

export const env = envSchema.parse({
	PB_ADMIN_EMAIL,
	PB_ADMIN_PASSWORD,
	STRIPE_SECRET_KEY
});
