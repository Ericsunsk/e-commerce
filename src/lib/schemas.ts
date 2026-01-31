import { z } from 'zod';
import { MESSAGES } from '$lib/messages';

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const loginSchema = z.object({
	email: z.string().email({ message: 'Invalid email address' }).default(''),
	password: z.string().min(1, { message: 'Password is required' }).default('')
});

export const registerSchema = z.object({
	firstName: z.string().min(1, { message: 'First name is required' }).default(''),
	lastName: z.string().min(1, { message: 'Last name is required' }).default(''),
	email: z.string().email({ message: 'Invalid email address' }).default(''),
	password: z.string().min(8, { message: MESSAGES.ERROR.PASSWORD_TOO_SHORT }).default(''),
	confirmPassword: z.string().default('')
});
// .refine((data) => data.password === data.confirmPassword, {
//     message: MESSAGES.ERROR.PASSWORDS_DO_NOT_MATCH,
//     path: ["confirmPassword"],
// });

export const passwordRecoverySchema = z.object({
	email: z.string().email({ message: 'Invalid email address' }).default('')
});

// =============================================================================
// CHECKOUT SCHEMAS
// =============================================================================

// Shipping/Billing Address Form Schema
export const shippingAddressSchema = z
	.object({
		email: z.string().email({ message: 'INVALID EMAIL' }),
		firstName: z.string().min(1, { message: 'REQUIRED' }),
		lastName: z.string().min(1, { message: 'REQUIRED' }),
		address: z.string().min(1, { message: 'REQUIRED' }),
		zip: z.string().min(1, { message: 'REQUIRED' }),
		city: z.string().min(1, { message: 'REQUIRED' }),
		country: z.string().default('United States')
	})
	.superRefine((data, ctx) => {
		// Country-specific zip code validation
		if (data.country === 'United States' && data.zip && !/^\d{5}(-\d{4})?$/.test(data.zip)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'INVALID ZIP (12345)',
				path: ['zip']
			});
		}
		if (
			data.country === 'Canada' &&
			data.zip &&
			!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(data.zip)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'INVALID POSTAL CODE (A1A 1A1)',
				path: ['zip']
			});
		}
	});

export type ShippingAddressSchema = z.infer<typeof shippingAddressSchema>;

export const cartItemSchema = z.object({
	id: z.string(),
	title: z.string(),
	price: z.string(), // e.g. "$100.00" - Display price
	priceValue: z.number().optional(), // Raw numeric price for calculations
	image: z.string().optional(),
	quantity: z.number().int().positive(),
	color: z.string().optional(),
	size: z.string().optional(),
	stripePriceId: z.string().optional()
});

export const checkoutSchema = z.object({
	items: z.array(cartItemSchema).min(1, { message: 'Cart cannot be empty' })
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type CheckoutSchema = z.infer<typeof checkoutSchema>;
