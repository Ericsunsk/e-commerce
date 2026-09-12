import { z } from 'zod';

/**
 * Shipping address as entered at checkout.
 *
 * Note: this is the *form* shape, deliberately distinct from
 * `order/domain/models.ts` `ShippingAddress`, which is the persisted order
 * snapshot. They are owned by different contexts and have diverged (different
 * defaults, different country validation), so they are not unified.
 */
export const ShippingAddressSchema = z
	.object({
		email: z.email({ message: 'INVALID EMAIL' }),
		firstName: z.string().min(1, { message: 'REQUIRED' }),
		lastName: z.string().min(1, { message: 'REQUIRED' }),
		address: z.string().min(1, { message: 'REQUIRED' }),
		zip: z.string().min(1, { message: 'REQUIRED' }),
		city: z.string().min(1, { message: 'REQUIRED' }),
		state: z.string().default(''),
		country: z.string().length(2).default('US')
	})
	.superRefine((data, ctx) => {
		if (data.country === 'US' && data.zip && !/^\d{5}(-\d{4})?$/.test(data.zip)) {
			ctx.addIssue({
				code: 'custom',
				message: 'INVALID ZIP (12345)',
				path: ['zip']
			});
		}
		if (
			data.country === 'CA' &&
			data.zip &&
			!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(data.zip)
		) {
			ctx.addIssue({
				code: 'custom',
				message: 'INVALID POSTAL CODE (A1A 1A1)',
				path: ['zip']
			});
		}
	});

/**
 * Inferred form-input type. Named `...Input` rather than bare `ShippingAddress`
 * on purpose: the bare name is taken by the order domain's persisted snapshot,
 * and a checkout<->order collision would be a genuine type error.
 */
export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;
