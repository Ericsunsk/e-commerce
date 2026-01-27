import type { PageServerLoad, Actions } from './$types';
import { getPage } from '$lib/server/content';
import { superValidate } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { loginSchema, registerSchema, passwordRecoverySchema } from '$lib/schemas';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const page = await getPage('account');

    return {
        user: locals.user,
        page,
        loginForm: await superValidate(zod(loginSchema)),
        registerForm: await superValidate(zod(registerSchema)),
        recoverForm: await superValidate(zod(passwordRecoverySchema))
    };
};

export const actions: Actions = {
    login: async ({ request }) => {
        const form = await superValidate(request, zod(loginSchema));
        if (!form.valid) return fail(400, { form });
        return { form };
    },
    register: async ({ request }) => {
        const form = await superValidate(request, zod(registerSchema));
        if (!form.valid) return fail(400, { form });
        return { form };
    },
    recover: async ({ request }) => {
        const form = await superValidate(request, zod(passwordRecoverySchema));
        if (!form.valid) return fail(400, { form });
        return { form };
    }
};
