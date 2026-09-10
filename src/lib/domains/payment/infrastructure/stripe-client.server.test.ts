import { describe, it, expect, vi } from 'vitest';
import { createStripeClientProvider } from './stripe-client.server';

function deps(config: { secretKey: string; publishableKey: string } = { secretKey: 'sk_db', publishableKey: 'pk_db' }) {
	return {
		getConfig: vi.fn().mockResolvedValue(config),
		createClient: vi.fn().mockImplementation((secret: string) => ({ __secret: secret }))
	};
}

describe('dynamic stripe client provider', () => {
	it('prefers database config and reuses the cached client', async () => {
		const d = deps();
		const provider = createStripeClientProvider(d as never);

		const first = await provider.getClient();
		const second = await provider.getClient();
		expect(first).toBe(second);
		expect(d.createClient).toHaveBeenCalledTimes(1);
		expect(d.createClient).toHaveBeenCalledWith('sk_db');
		expect(await provider.getPublishableKey()).toBe('pk_db');
	});

	it('rotates the client when the secret changes (hot switch)', async () => {
		const d = deps();
		const provider = createStripeClientProvider(d as never);

		await provider.getClient();
		d.getConfig.mockResolvedValue({ secretKey: 'sk_new', publishableKey: 'pk_new' });

		const rotated = await provider.getClient();
		expect(rotated).toEqual({ __secret: 'sk_new' });
		expect(d.createClient).toHaveBeenCalledTimes(2);
	});

	it('honours explicit invalidation', async () => {
		const d = deps();
		const provider = createStripeClientProvider(d as never);

		await provider.getClient();
		provider.invalidate();
		await provider.getClient();
		expect(d.createClient).toHaveBeenCalledTimes(2);
	});

	it('refuses to build a client without a secret', async () => {
		const d = deps({ secretKey: '', publishableKey: '' });
		const provider = createStripeClientProvider(d as never);
		await expect(provider.getClient()).rejects.toThrow('未配置 Stripe 私钥');
		expect(d.createClient).not.toHaveBeenCalled();
	});

	it('single-flights concurrent first builds', async () => {
		let release!: (c: object) => void;
		const gate = new Promise<object>((resolve) => {
			release = resolve;
		});
		const d = deps();
		d.createClient.mockReturnValue(gate as never);
		const provider = createStripeClientProvider(d as never);

		const pending = Promise.all([provider.getClient(), provider.getClient()]);
		release({ __secret: 'sk_db' });
		const [a, b] = await pending;
		expect(a).toBe(b);
		expect(d.createClient).toHaveBeenCalledTimes(1);
	});
});
