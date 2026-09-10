import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { shippingAddressSchema } from '$domains/checkout';
import { getPublishableKey } from '$domains/payment/server';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	// Initialize empty form with defaults
	const form = await superValidate(zod(shippingAddressSchema));

	// Set default country to US (2-letter code)
	form.data.country = 'US';

	// Publishable key resolves dynamically (database first, env fallback).
	let stripeKey = '';
	try {
		stripeKey = await getPublishableKey();
	} catch {
		// Checkout renders anyway; Elements init surfaces the problem.
	}

	return {
		stripeKey,
		form
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(shippingAddressSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Form is valid, return success
		return { form };
	}
};
