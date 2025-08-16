import fs from 'fs';
import path from 'path';
import axios from 'axios';

const userEmailTemplatePath = path.join(__dirname, './user-otp-email.html');
console.log("user email template path:", userEmailTemplatePath);
const brandColor = '#ec4899'; // All That Glitters pink

interface SendUserOtpParams {
  toEmail: string;
  toName: string;
  otp: string;
}

/**
 * Reads the HTML template, replaces placeholders, and sends the welcome OTP email via Brevo
 * This is specifically for user registration/verification emails
 */
export const sendUserOtpEmail = async ({ toEmail, toName, otp }: SendUserOtpParams): Promise<void> => {
  // Read the HTML template
  const template = fs.readFileSync(userEmailTemplatePath, 'utf-8');

  // Generate the current year for copyright
  const year = new Date().getFullYear().toString();

  // Fill in all placeholders in the template
  const htmlContent = template
    .replace(/{{userName}}/g, toName || "there")
    .replace(/{{otp}}/g, otp)
    .replace(/{{brandColor}}/g, brandColor)
    .replace(/{{year}}/g, year);

  // Send the email using Brevo/Smtp API
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: 'All That Glitters', email: process.env.NOREPLY_EMAIL },
      to: [{ email: toEmail, name: toName }],
      subject: 'Welcome to All That Glitters - Verify Your Email',
      htmlContent
    },
    {
      headers: {
        accept: 'application/json',
        'api-key': process.env.EMAIL_API_KEY as string,
        'content-type': 'application/json'
      }
    }
  );
};

// You can also keep the original admin function and just update the imports in your controllers
export const sendAdminOtpEmail = async ({ toEmail, toName, otp }: SendUserOtpParams): Promise<void> => {
  const adminTemplatePath = path.join(__dirname, './otp-email.html');
  const template = fs.readFileSync(adminTemplatePath, 'utf-8');
  const year = new Date().getFullYear().toString();

  const htmlContent = template
    .replace(/{{userName}}/g, toName || "Admin")
    .replace(/{{otp}}/g, otp)
    .replace(/{{brandColor}}/g, brandColor)
    .replace(/{{year}}/g, year);

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: 'All That Glitters', email: process.env.NOREPLY_EMAIL },
      to: [{ email: toEmail, name: toName }],
      subject: 'Your OTP for All That Glitters Admin Portal',
      htmlContent
    },
    {
      headers: {
        accept: 'application/json',
        'api-key': process.env.EMAIL_API_KEY as string,
        'content-type': 'application/json'
      }
    }
  );
};