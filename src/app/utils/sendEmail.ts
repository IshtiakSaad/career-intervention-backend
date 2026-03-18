import nodemailer from 'nodemailer';
import { envVars } from '../config/env';

interface IEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: IEmailOptions): Promise<void> => {
  if (!envVars.SMTP_HOST || !envVars.SMTP_USER || !envVars.SMTP_PASS) {
    console.warn('Email config missing, skipping email send to: ', options.to);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: envVars.SMTP_HOST,
    port: parseInt(envVars.SMTP_PORT || '587', 10),
    secure: envVars.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: envVars.SMTP_USER,
      pass: envVars.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"Career Server" <${envVars.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
