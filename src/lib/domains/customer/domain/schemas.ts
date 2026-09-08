import { z } from 'zod';
import { MESSAGES } from '$shared/kernel';

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

export const passwordRecoverySchema = z.object({
	email: z.string().email({ message: 'Invalid email address' }).default('')
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type PasswordRecoverySchema = z.infer<typeof passwordRecoverySchema>;
