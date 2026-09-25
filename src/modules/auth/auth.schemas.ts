import { z } from 'zod';

// Messages mirror the Joi wording the old API returned.
const required = (field: string) => `"${field}" is required`;
const email = (field: string) =>
  z.string({ error: required(field) }).trim().email(`"${field}" must be a valid email`);
const minLength = (field: string, n: number) =>
  z.string({ error: required(field) }).min(n, `"${field}" length must be at least ${n} characters long`);
const otp = z
  .union([z.string(), z.number()], { error: 'OTP is required' })
  .transform(String)
  .pipe(z.string().trim().min(1, 'OTP is required'));

export const loginBody = z.object({
  email: email('email'),
  password: z.string({ error: required('password') }).min(1, `"password" is not allowed to be empty`),
});

export const changePasswordRequestBody = z.object({
  currentPassword: z.string({ error: required('currentPassword') }).min(1, `"currentPassword" is not allowed to be empty`),
  newPassword: minLength('newPassword', 8),
});

export const otpBody = z.object({ otp });

export const changeEmailRequestBody = z.object({ newEmail: email('newEmail') });

export const forgotPasswordRequestBody = z.object({ email: email('email') });

export const forgotPasswordConfirmBody = z.object({
  email: email('email'),
  otp: z.string({ error: required('otp') }).trim().length(6, `"otp" length must be 6 characters long`),
  newPassword: minLength('newPassword', 8),
});
