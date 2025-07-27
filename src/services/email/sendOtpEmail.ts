import fs from 'fs';
import path from 'path';
import axios from 'axios';

const emailTemplatePath = path.join(__dirname, './otp-email.html');
console.log("email template path:", emailTemplatePath);
const brandColor = '#ec4899'; // Use your All That Glitters pink

interface SendOtpParams {
  toEmail: string;
  toName: string;
  otp: string;
}

/**
 * Reads the HTML template, replaces placeholders, and sends the email via Brevo
 */
export const sendOtpEmail = async ({ toEmail, toName, otp }: SendOtpParams): Promise<void> => {
  // Read the HTML template
  const template = fs.readFileSync(emailTemplatePath, 'utf-8');

  // Generate the current year for copyright
  const year = new Date().getFullYear().toString();

  // Fill in all placeholders in the template
  const htmlContent = template
    .replace(/{{userName}}/g, toName || "user")
    .replace(/{{otp}}/g, otp)
    .replace(/{{brandColor}}/g, brandColor)
    .replace(/{{year}}/g, year);

  // Send the email using Brevo/Smtp API
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: 'All That Glitters', email: process.env.NOREPLY_EMAIL },
      to: [{ email: toEmail, name: toName }],
      subject: 'Your OTP for All That Glitters',
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
