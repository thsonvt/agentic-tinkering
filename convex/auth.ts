import Google from '@auth/core/providers/google';
import {convexAuth} from '@convex-dev/auth/server';
import {ResendOTP} from './ResendOTP';

const siteUrl = process.env.SITE_URL?.replace(/\/$/, '');

export const {auth, signIn, signOut, store} = convexAuth({
  providers: [
    ResendOTP,
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async redirect({redirectTo}) {
      if (!siteUrl) {
        throw new Error('SITE_URL is not configured');
      }

      if (redirectTo.startsWith('?') || redirectTo.startsWith('/')) {
        return `${siteUrl}${redirectTo}`;
      }

      if (redirectTo.startsWith(siteUrl)) {
        const after = redirectTo[siteUrl.length];
        if (after === undefined || after === '?' || after === '/') {
          return redirectTo;
        }
      }

      const url = new URL(redirectTo);
      if (url.hostname.endsWith('.chromiumapp.org')) {
        return redirectTo;
      }

      throw new Error(`Invalid redirectTo: ${redirectTo}`);
    },
  },
});
