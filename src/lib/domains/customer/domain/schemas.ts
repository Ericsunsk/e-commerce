import { z } from 'zod';
import { MESSAGES } from '$shared/kernel';

export const LoginSchema = z.object({
	email: z.email({ message: 'Invalid email address' }).default(''),
	password: z.string().min(1, { message: 'Password is required' }).default('')
});

export const RegisterSchema = z.object({
	firstName: z.string().min(1, { message: 'First name is required' }).default(''),
	lastName: z.string().min(1, { message: 'Last name is required' }).default(''),
	email: z.email({ message: 'Invalid email address' }).default(''),
	password: z.string().min(8, { message: MESSAGES.ERROR.PASSWORD_TOO_SHORT }).default(''),
	confirmPassword: z.string().default('')
});

export const PasswordRecoverySchema = z.object({
	email: z.email({ message: 'Invalid email address' }).default('')
});

export type LoginSchemaInput = z.infer<typeof LoginSchema>;
export type RegisterSchemaInput = z.infer<typeof RegisterSchema>;
export type PasswordRecoverySchemaInput = z.infer<typeof PasswordRecoverySchema>;
