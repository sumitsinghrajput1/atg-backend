import fs from 'fs';
import path from 'path';
import axios from 'axios';

const emailTemplatePath = path.join(__dirname, './otp-email.html');
console.log("e,ail" , emailTemplatePath)
const brandColor = '#6366f1';

interface SendOtpParams {
  toEmail: string;
  toName: string;
  otp: string;
}

export const sendOtpEmail = async ({ toEmail, toName, otp }: SendOtpParams): Promise<void> => {
  const template = fs.readFileSync(emailTemplatePath, 'utf-8');
  const htmlContent = template
    .replace(/{{userName}}/g, toName)
    .replace(/{{otp}}/g, otp)
    .replace(/{{brandColor}}/g, brandColor);

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: 'All That Glitters', email: process.env.NOREPLY_EMAIL },
      to: [{ email: toEmail, name: toName }],
      subject: 'Your OTP for All that glitters',
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
