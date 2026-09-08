import { z } from 'zod';

export const shippingAddressSchema = z
	.object({
		email: z.string().email({ message: 'INVALID EMAIL' }),
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
				code: z.ZodIssueCode.custom,
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
				code: z.ZodIssueCode.custom,
				message: 'INVALID POSTAL CODE (A1A 1A1)',
				path: ['zip']
			});
		}
	});

export type ShippingAddressSchema = z.infer<typeof shippingAddressSchema>;
