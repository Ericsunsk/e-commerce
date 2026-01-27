import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

// 开发模式：如果没有 Stripe Key，使用占位符（API 调用会在 products.ts 中被跳过）
const secretKey = env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_dev_mode';

export const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
});

// 导出一个标志，用于检查是否在开发模式（无真实 Key）
export const isStripeConfigured = !!env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.includes('placeholder');
