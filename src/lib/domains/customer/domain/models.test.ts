import { describe, it, expect } from 'vitest';
import { WishlistItemSchema } from './models';
import { loginSchema, registerSchema, passwordRecoverySchema } from './schemas';

describe('Customer Domain Models & Schemas', () => {
	it('validates a valid WishlistItem', () => {
		const item = {
			id: 'prod_123',
			title: 'Silk Scarf',
			price: 120,
			slug: 'silk-scarf'
		};
		const parsed = WishlistItemSchema.parse(item);
		expect(parsed.id).toBe('prod_123');
		expect(parsed.title).toBe('Silk Scarf');
		expect(parsed.price).toBe(120);
	});

	it('validates login schema properly', () => {
		const valid = loginSchema.safeParse({
			email: 'test@example.com',
			password: 'secretpassword'
		});
		expect(valid.success).toBe(true);

		const invalid = loginSchema.safeParse({
			email: 'not-an-email',
			password: ''
		});
		expect(invalid.success).toBe(false);
	});

	it('validates register schema properly', () => {
		const valid = registerSchema.safeParse({
			firstName: 'Jane',
			lastName: 'Doe',
			email: 'jane@example.com',
			password: 'longenoughpassword',
			confirmPassword: 'longenoughpassword'
		});
		expect(valid.success).toBe(true);

		const shortPassword = registerSchema.safeParse({
			firstName: 'Jane',
			lastName: 'Doe',
			email: 'jane@example.com',
			password: 'short',
			confirmPassword: 'short'
		});
		expect(shortPassword.success).toBe(false);
	});

	it('validates password recovery schema', () => {
		const valid = passwordRecoverySchema.safeParse({ email: 'hello@example.com' });
		expect(valid.success).toBe(true);

		const invalid = passwordRecoverySchema.safeParse({ email: 'bad' });
		expect(invalid.success).toBe(false);
	});
});
