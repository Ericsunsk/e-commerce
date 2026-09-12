import type { PageServerLoad, Actions } from './$types';
import { getPage } from '$domains/content/server';
import { superValidate } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { LoginSchema, RegisterSchema, PasswordRecoverySchema } from '$domains/customer';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const page = await getPage('account');

	return {
		user: locals.user,
		page,
		loginForm: await superValidate(zod(LoginSchema)),
		registerForm: await superValidate(zod(RegisterSchema)),
		recoverForm: await superValidate(zod(PasswordRecoverySchema))
	};
};

export const actions: Actions = {
	login: async ({ request }) => {
		const form = await superValidate(request, zod(LoginSchema));
		if (!form.valid) return fail(400, { form });
		return { form };
	},
	register: async ({ request }) => {
		const form = await superValidate(request, zod(RegisterSchema));
		if (!form.valid) return fail(400, { form });
		return { form };
	},
	recover: async ({ request }) => {
		const form = await superValidate(request, zod(PasswordRecoverySchema));
		if (!form.valid) return fail(400, { form });
		return { form };
	}
};
