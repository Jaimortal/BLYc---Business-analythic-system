import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address.')
    .min(5, 'Email must be at least 5 characters.')
    .max(100, 'Email must not exceed 100 characters.')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must not exceed 128 characters.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address.').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required.')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
