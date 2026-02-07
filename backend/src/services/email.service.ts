import nodemailer from 'nodemailer';

// Zoho SMTP Configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.in',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: `"StudyAsan" <${process.env.ZOHO_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

export const sendOTPEmail = async (
  email: string, 
  otp: string, 
  name: string, 
  purpose: 'Registration' | 'Password Reset' = 'Registration'
): Promise<boolean> => {
  const isPasswordReset = purpose === 'Password Reset';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isPasswordReset ? 'Reset Your Password' : 'Verify Your Email'} - StudyAsan</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f7fa;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0076CE 0%, #0055a3 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <img src="https://xdas-tech.sirv.com/studyasan-logo.png" alt="StudyAsan" style="height: 60px; margin-bottom: 20px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">${isPasswordReset ? 'Password Reset' : 'Email Verification'}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hello <strong>${name}</strong>,
                  </p>
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                    ${isPasswordReset 
                      ? 'We received a request to reset your password. Please enter the following verification code to proceed:' 
                      : 'Thank you for registering with StudyAsan! To complete your registration, please enter the following verification code:'}
                  </p>
                  
                  <!-- OTP Box -->
                  <div style="background: linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px;">
                    <p style="color: #666; font-size: 14px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px;">${isPasswordReset ? 'Password Reset Code' : 'Your Verification Code'}</p>
                    <div style="background: #ffffff; border-radius: 10px; padding: 20px 30px; display: inline-block; box-shadow: 0 2px 12px rgba(0, 118, 206, 0.15);">
                      <span style="font-size: 36px; font-weight: 700; color: #0076CE; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                    </div>
                    <p style="color: #888; font-size: 13px; margin: 15px 0 0;">This code expires in <strong>10 minutes</strong></p>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                    ${isPasswordReset 
                      ? 'If you didn\'t request a password reset, please ignore this email and your password will remain unchanged.' 
                      : 'If you didn\'t request this verification, please ignore this email.'}
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 25px 40px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #888; font-size: 13px; margin: 0 0 10px;">
                    © 2024 StudyAsan. All rights reserved.
                  </p>
                  <p style="color: #aaa; font-size: 12px; margin: 0;">
                    This is an automated message, please do not reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: isPasswordReset ? 'Reset Your Password - StudyAsan' : 'Verify Your Email - StudyAsan',
    html,
  });
};
