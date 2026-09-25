/**
 * HTML for OTP emails. Copied unchanged from the old email service so users
 * receive the same message.
 */
export type OtpEmailKind = 'passwordChange' | 'emailChange';

export const OTP_SUBJECTS: Record<OtpEmailKind, string> = {
  passwordChange: 'Your Robotrick Password Change Request',
  emailChange: 'Verify Your New Email Address — Robotrick',
};

const COPY: Record<OtpEmailKind, Record<'preheader' | 'heading' | 'subheading' | 'action' | 'notYou' | 'notYouAction', string>> = {
  passwordChange: {
    preheader: 'Your verification code to change your password.',
    heading: 'Password Change Request',
    subheading: 'We received a request to change the password on your Robotrick account.',
    action: 'Use the verification code below to complete this process.',
    notYou: 'If you did not request a password change, your account may be at risk.',
    notYouAction: 'We recommend you log in and review your account security immediately.',
  },
  emailChange: {
    preheader: 'Your verification code to confirm your new email address.',
    heading: 'Verify Your New Email',
    subheading: 'You requested to update the email address associated with your Robotrick account.',
    action: 'Enter the verification code below to confirm ownership of this address.',
    notYou: 'If you did not request this change, you can safely ignore this email.',
    notYouAction: 'Your current email address will remain unchanged.',
  },
};

export function buildOtpEmailHtml(otp: string, kind: OtpEmailKind): string {
  const copy = COPY[kind];
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${copy.heading}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-pad { padding: 24px 20px !important; }
      .otp-code { font-size: 32px !important; letter-spacing: 8px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f0f2f5;">
    ${copy.preheader}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Email card -->
        <table role="presentation" class="email-container" width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Top accent bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#003300 0%,#005500 100%);height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background:#003300;padding:32px 40px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Logo wordmark -->
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#ffffff;border-radius:8px;padding:6px 14px;">
                          <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:17px;font-weight:800;color:#003300;letter-spacing:1px;">ROBOTRICK</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:0.5px;text-transform:uppercase;">${copy.heading}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content-pad" style="padding:40px 40px 32px;">

              <!-- Heading -->
              <h1 style="margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                ${copy.heading}
              </h1>
              <p style="margin:0 0 24px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#475569;line-height:1.6;">
                ${copy.subheading}
              </p>

              <p style="margin:0 0 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:#64748b;line-height:1.6;">
                ${copy.action}
              </p>

              <!-- OTP box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:28px 20px;">
                    <p style="margin:0 0 10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Verification Code</p>
                    <p class="otp-code" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:800;letter-spacing:12px;color:#003300;line-height:1;">
                      ${otp}
                    </p>
                    <p style="margin:12px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#94a3b8;">
                      Expires in <strong style="color:#64748b;">10 minutes</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security warning -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px;">
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#92400e;line-height:1.5;">
                      <strong>Never share this code.</strong> Robotrick staff will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;"></td>
          </tr>

          <!-- Not you section -->
          <tr>
            <td class="content-pad" style="padding:24px 40px 32px;">
              <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;line-height:1.6;">
                <strong style="color:#475569;">Didn't request this?</strong> ${copy.notYou}
              </p>
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#94a3b8;line-height:1.6;">
                ${copy.notYouAction}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:20px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#cbd5e1;line-height:1.6;">
                      © ${year} Robotrick. All rights reserved.<br>
                      This is an automated security email — please do not reply.
                    </p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#e2e8f0;font-weight:700;letter-spacing:1px;">ROBOTRICK</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- / Email card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}
