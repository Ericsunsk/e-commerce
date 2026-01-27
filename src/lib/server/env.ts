import { z } from 'zod';
import { 
    PB_ADMIN_EMAIL, 
    PB_ADMIN_PASSWORD, 
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    N8N_WEBHOOK_URL
} from '$env/static/private';

const envSchema = z.object({
    PB_ADMIN_EMAIL: z.string().email("PB_ADMIN_EMAIL must be a valid email"),
    PB_ADMIN_PASSWORD: z.string().min(1, "PB_ADMIN_PASSWORD is required"),
    STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
    // Optional but strict if present
    STRIPE_WEBHOOK_SECRET: z.string().optional(), 
    N8N_WEBHOOK_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
    PB_ADMIN_EMAIL,
    PB_ADMIN_PASSWORD,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    N8N_WEBHOOK_URL
});
