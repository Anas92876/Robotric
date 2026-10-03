import type { Request, Response } from 'express';
import type { AuthCookie } from '../../shared/auth/auth-cookie';
import { currentUser } from '../../shared/http/request-user';
import { parse } from '../../shared/http/validate';
import {
  changeEmailRequestBody,
  changePasswordRequestBody,
  forgotPasswordConfirmBody,
  forgotPasswordRequestBody,
  loginBody,
  otpBody,
} from './auth.schemas';
import { type AuthService, EMAIL_CHANGE_GENERIC, FORGOT_PASSWORD_GENERIC } from './auth.service';

/** HTTP adapter for AuthService: parses input, sets cookies, shapes JSON. */
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookie: AuthCookie,
  ) {}

  login = async (req: Request, res: Response) => {
    const { email, password } = parse(loginBody, req.body);
    const data = await this.auth.login(email, password);
    this.cookie.set(req, res, data.token);
    res.json({ success: true, message: 'Login successful', data });
  };

  logout = async (req: Request, res: Response) => {
    await this.auth.logout(currentUser(req).id);
    this.cookie.clear(res);
    res.json({ success: true, message: 'Logged out successfully' });
  };

  me = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.auth.me(currentUser(req).id) });
  };

  requestPasswordChange = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = parse(changePasswordRequestBody, req.body);
    await this.auth.requestPasswordChange(currentUser(req).id, currentPassword, newPassword);
    res.json({ success: true, message: 'OTP sent to your email' });
  };

  confirmPasswordChange = async (req: Request, res: Response) => {
    const { otp } = parse(otpBody, req.body);
    const { token } = await this.auth.confirmPasswordChange(currentUser(req).id, otp);
    this.cookie.set(req, res, token);
    res.json({ success: true, message: 'Password changed successfully', data: { token } });
  };

  requestEmailChange = async (req: Request, res: Response) => {
    const { newEmail } = parse(changeEmailRequestBody, req.body);
    await this.auth.requestEmailChange(currentUser(req).id, newEmail);
    res.json({ success: true, message: EMAIL_CHANGE_GENERIC });
  };

  confirmEmailChange = async (req: Request, res: Response) => {
    const { otp } = parse(otpBody, req.body);
    const data = await this.auth.confirmEmailChange(currentUser(req).id, otp);
    res.json({ success: true, message: 'Email changed successfully', data });
  };

  requestForgotPassword = async (req: Request, res: Response) => {
    const { email } = parse(forgotPasswordRequestBody, req.body);
    await this.auth.requestForgotPassword(email);
    res.json({ success: true, message: FORGOT_PASSWORD_GENERIC });
  };

  confirmForgotPassword = async (req: Request, res: Response) => {
    const { email, otp, newPassword } = parse(forgotPasswordConfirmBody, req.body);
    await this.auth.confirmForgotPassword(email, otp, newPassword);
    res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  };
}
