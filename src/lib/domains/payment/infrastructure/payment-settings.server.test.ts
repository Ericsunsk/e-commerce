import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { default: StripeMock } = await import('stripe');
vi.mock('stripe', () => ({
	default: vi.fn()
}));

import {
	ensurePaymentSettingsCollection,
	upsertSettingsRowWithClient,
	testStripeConnection
} from './payment-settings.server';

function fakePb(state: {
	collectionExists?: boolean;
	collectionFields?: string[];
	rows?: Array<Record<string, unknown>>;
	failGetWith?: number;
}) {
	return {
		collections: {
			getOne: vi.fn().mockImplementation(async () => {
				if (state.collectionExists)
					return {
						id: 'pbc_1',
						name: 'payment_settings',
						fields: (state.collectionFields ?? []).map((name) => ({ name }))
					};
				throw { status: 404, message: 'not found' };
			}),
			create: vi.fn().mockImplementation(async (spec: unknown) => spec),
			update: vi.fn().mockImplementation(async (_id: string, spec: unknown) => spec)
		},
		collection: vi.fn().mockReturnValue({
			getFullList: vi.fn().mockImplementation(async () => {
				if (state.failGetWith) throw { status: state.failGetWith };
				return state.rows ?? [];
			}),
			create: vi.fn().mockImplementation(async (payload: unknown) => ({
				id: 'row1',
				...(payload as object)
			})),
			update: vi.fn().mockImplementation(async (id: string, payload: unknown) => ({
				id,
				...(payload as object)
			}))
		})
	};
}

describe('payment settings collection bootstrap', () => {
	it('does nothing when the collection is complete', async () => {
		const pb = fakePb({
			collectionExists: true,
			collectionFields: [
				'id',
				'stripe_publishable_key',
				'stripe_secret_key',
				'stripe_webhook_secret',
				'stripe_enabled'
			]
		});
		await ensurePaymentSettingsCollection(pb as never);
		expect(pb.collections.create).not.toHaveBeenCalled();
		expect(pb.collections.update).not.toHaveBeenCalled();
	});

	it('backfills missing fields on a bare table', async () => {
		const pb = fakePb({ collectionExists: true, collectionFields: ['id'] });
		await ensurePaymentSettingsCollection(pb as never);
		expect(pb.collections.create).not.toHaveBeenCalled();
		expect(pb.collections.update).toHaveBeenCalledWith(
			'pbc_1',
			expect.objectContaining({ fields: expect.any(Array) })
		);
		const fields = pb.collections.update.mock.calls[0][1].fields.map(
			(f: { name: string }) => f.name
		);
		expect(fields).toEqual(
			expect.arrayContaining([
				'stripe_publishable_key',
				'stripe_secret_key',
				'stripe_webhook_secret',
				'stripe_enabled'
			])
		);
	});

	it('creates a locked-down collection on first visit', async () => {
		const pb = fakePb({ collectionExists: false });
		await ensurePaymentSettingsCollection(pb as never);
		expect(pb.collections.create).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'payment_settings',
				listRule: null,
				viewRule: null,
				createRule: null,
				updateRule: null,
				deleteRule: null
			})
		);
	});
});

describe('settings row upsert', () => {
	it('creates the singleton row when none exists', async () => {
		const pb = fakePb({ rows: [] });
		const row = await upsertSettingsRowWithClient(pb as never, { enabled: false });
		expect(row.id).toBe('row1');
		expect(pb.collection('x').create).toHaveBeenCalledWith(
			expect.objectContaining({ stripe_enabled: false })
		);
	});

	it('updates the existing row on save', async () => {
		const pb = fakePb({
			rows: [{ id: 'row1', stripe_publishable_key: 'pk_old' }]
		});
		const row = await upsertSettingsRowWithClient(pb as never, {
			publishableKey: 'pk_test_new'
		});
		expect(row.id).toBe('row1');
		expect(pb.collection('x').update).toHaveBeenCalledWith(
			'row1',
			expect.objectContaining({ stripe_publishable_key: 'pk_test_new' })
		);
	});
});

describe('stripe connection test', () => {
	beforeEach(() => {
		vi.mocked(StripeMock).mockReset();
	});

	it('reports success with the account id', async () => {
		vi.mocked(StripeMock).mockImplementation(function () {
			return { accounts: { retrieve: async () => ({ id: 'acct_123' }) } };
		} as never);
		const result = await testStripeConnection('sk_test_valid');
		expect(result).toMatchObject({ ok: true, accountId: 'acct_123' });
		expect(StripeMock).toHaveBeenCalledWith('sk_test_valid', expect.anything());
	});

	it('surfaces stripe errors without leaking the key', async () => {
		vi.mocked(StripeMock).mockImplementation(function () {
			return {
				accounts: {
					retrieve: async () => {
						throw new Error('Invalid API Key provided: sk_test_***');
					}
				}
			};
		} as never);
		const result = await testStripeConnection('sk_test_bad');
		expect(result.ok).toBe(false);
		expect(result.message).toContain('连接失败');
	});

	it('requires a key instead of calling stripe blindly', async () => {
		// No candidate and no backend → config load fails → clean failure.
		const result = await testStripeConnection('');
		expect(result.ok).toBe(false);
		expect(StripeMock).not.toHaveBeenCalled();
	});
});
