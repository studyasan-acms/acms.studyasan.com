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

export const sendNotificationEmail = async (
  email: string,
  name: string,
  title: string,
  description: string,
  type: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notification - StudyAsan</title>
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">StudyAsan Notification</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hello <strong>${name}</strong>,
                  </p>
                  
                  <!-- Notification Type Badge -->
                  <div style="margin: 0 0 20px;">
                    <span style="display: inline-block; padding: 6px 16px; background: linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%); color: #0076CE; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${type}
                    </span>
                  </div>
                  
                  <!-- Notification Title -->
                  <div style="background: #f8fafc; border-left: 4px solid #0076CE; border-radius: 8px; padding: 20px; margin: 0 0 20px;">
                    <h2 style="color: #0076CE; font-size: 20px; margin: 0 0 10px; font-weight: 600;">
                      ${title}
                    </h2>
                    ${description ? `<p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0;">
                      ${description}
                    </p>` : ''}
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0 0;">
                    <a href="https://studyasan.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0076CE 0%, #0055a3 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      View on Dashboard
                    </a>
                  </div>
                  
                  <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                    You can also check this notification in the app or website.
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
    subject: `${title} - StudyAsan`,
    html,
  });
};

export const sendCertificateEmail = async (
  email: string,
  name: string,
  testTitle: string,
  certificateCode: string,
  score: number,
  totalMarks: number
): Promise<boolean> => {
  const percentage = Math.round((score / totalMarks) * 100);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificate of Achievement - StudyAsan</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f7fa;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Certificate of Achievement</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <p style="color: #555; font-size: 16px; margin: 0 0 10px;">This certifies that</p>
                    <h2 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 20px;">${name}</h2>
                    <p style="color: #555; font-size: 16px; margin: 0 0 10px;">has successfully passed the examination for</p>
                    <h3 style="color: #0076CE; font-size: 20px; font-weight: 600; margin: 0;">${testTitle}</h3>
                  </div>

                  <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
                          <p style="color: #64748b; font-size: 12px; text-transform: uppercase; margin: 0 0 5px; letter-spacing: 0.5px;">Score Achieved</p>
                          <p style="color: #10B981; font-size: 24px; font-weight: 700; margin: 0;">${percentage}%</p>
                        </td>
                        <td align="center" style="padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0;">
                          <p style="color: #64748b; font-size: 12px; text-transform: uppercase; margin: 0 0 5px; letter-spacing: 0.5px;">Marks</p>
                          <p style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0;">${score} / ${totalMarks}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" align="center" style="padding-top: 15px;">
                          <p style="color: #64748b; font-size: 12px; text-transform: uppercase; margin: 0 0 5px; letter-spacing: 0.5px;">Certificate Code</p>
                          <p style="color: #334155; font-size: 16px; font-family: monospace; font-weight: 600; margin: 0; letter-spacing: 1px;">${certificateCode}</p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
                    Verified by StudyAsan Certification System.<br>
                    Issued on ${new Date().toLocaleDateString()}
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    © 2024 StudyAsan. All rights reserved.
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
    subject: `Certificate of Achievement - ${testTitle}`,
    html,
  });
};
