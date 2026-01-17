import {Email} from '@convex-dev/auth/providers/Email';
import {alphabet, generateRandomString} from 'oslo/crypto';
import {Resend as ResendAPI} from 'resend';

export const ResendOTP = Email({
  id: 'resend-otp',
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    return generateRandomString(6, alphabet('0-9'));
  },
  async sendVerificationRequest({identifier: email, provider, token}) {
    const resend = new ResendAPI(provider.apiKey);
    const {error} = await resend.emails.send({
      from: process.env.AUTH_EMAIL ?? 'Agentic Tinkering <onboarding@resend.dev>',
      to: [email],
      subject: 'Your sign-in code',
      text: `Your verification code is: ${token}\n\nThis code expires in 15 minutes.`,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
