import { Resend } from 'resend';
import type { Logger } from '../logger';
import { ServiceUnavailableError } from '../http/errors';
import { buildOtpEmailHtml, OTP_SUBJECTS, type OtpEmailKind } from './otp-email.template';

/** What services depend on. Swap the implementation without touching callers. */
export interface EmailSender {
  sendOtp(to: string, otp: string, kind: OtpEmailKind): Promise<void>;
}

export class ResendEmailSender implements EmailSender {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly logger: Logger,
  ) {
    this.client = new Resend(apiKey);
  }

  async sendOtp(to: string, otp: string, kind: OtpEmailKind): Promise<void> {
    const { data, error } = await this.client.emails.send({
      from: this.from,
      to,
      subject: OTP_SUBJECTS[kind],
      html: buildOtpEmailHtml(otp, kind),
    });
    if (error) {
      this.logger.error({ error, to, kind }, 'OTP email failed');
      throw new ServiceUnavailableError('Could not send the verification email. Please try again.', 'EMAIL_SEND_FAILED');
    }
    this.logger.info({ id: data?.id, to, kind }, 'OTP email sent');
  }
}

/** Used when RESEND_API_KEY is not set (local development): logs instead of sending. */
export class LogOnlyEmailSender implements EmailSender {
  constructor(private readonly logger: Logger) {}

  async sendOtp(to: string, otp: string, kind: OtpEmailKind): Promise<void> {
    this.logger.warn({ to, kind, otp }, 'Email not configured — OTP logged instead of sent');
  }
}
