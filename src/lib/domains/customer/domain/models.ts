import { z } from 'zod';

export interface AuthUser {
	id: string;
	email: string;
	name?: string;
	avatar?: string;
	verified: boolean;
	stripeCustomerId?: string;
	isAdmin?: boolean;
}

export interface UserAddress {
	id: string;
	userId: string;
	label?: string;
	recipientName: string;
	phone?: string;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postalCode: string;
	country: string;
	isDefault?: boolean;
}

export const WishlistItemSchema = z.object({
	id: z.string(),
	variantId: z.string().optional(),
	title: z.string().optional(),
	price: z.number().optional(),
	image: z.string().optional(),
	slug: z.string().optional(),
	stripePriceId: z.string().optional()
});

export type WishlistItem = z.infer<typeof WishlistItemSchema>;
