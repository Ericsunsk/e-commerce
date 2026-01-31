import { stripe } from '$lib/server/stripe';
import { priceToCents } from '$lib/utils/price';
import { STRIPE } from '$lib/constants';
import type { RequestHandler } from './$types';
import { checkoutSchema } from '$lib/schemas';
import { apiHandler } from '$lib/server/api-handler';

export const POST: RequestHandler = apiHandler(async ({ request, url }) => {
	const body = await request.json();
	const origin = url.origin;

	const result = checkoutSchema.safeParse(body);

	if (!result.success) {
		throw { status: 400, message: result.error.issues[0].message };
	}

	const { items } = result.data;

	// Map cart items to Stripe line items
	const lineItems = items.map((item) => {
		const imageUrl = item.image?.startsWith('http') ? item.image : undefined;

		// If we have a price ID (starting with price_), use it directly for better tracking
		if (item.stripePriceId && item.stripePriceId.startsWith('price_')) {
			return {
				price: item.stripePriceId,
				quantity: item.quantity
			};
		}

		// Fallback to manual price data (useful for ad-hoc or when only prod_id is known)
		return {
			price_data: {
				currency: 'usd',
				product_data: {
					name: item.title,
					description: `${item.color || ''} / ${item.size || ''}`.replace(/^\s\/\s$/, '').trim(),
					images: imageUrl ? [imageUrl] : [],
					metadata: {
						color: item.color || null,
						size: item.size || null,
						pb_id: item.id // Pass PocketBase Record ID
					}
				},
				unit_amount: priceToCents(item.price)
			},
			quantity: item.quantity
		};
	});

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: lineItems,
		mode: 'payment',
		success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/checkout`,
		// Optional: Add shipping address collection
		shipping_address_collection: {
			allowed_countries: [...STRIPE.ALLOWED_COUNTRIES]
		}
	});

	return { url: session.url };
});
