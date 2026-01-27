import { env } from '$env/dynamic/public';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { shippingAddressSchema } from '$lib/schemas';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
    // Initialize empty form with defaults
    const form = await superValidate(zod(shippingAddressSchema));
    
    return {
        stripeKey: env.PUBLIC_STRIPE_KEY,
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
