import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

import { otpEmail, sendBrandedEmail } from "../lib/brandedEmail";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, token }) {
    try {
      await sendBrandedEmail({
        to: email,
        ...otpEmail({ email, code: token }),
      });
    } catch (error) {
      // Never surface the request itself: it carries the integration key.
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not send the BotArena access code: ${message}`);
    }
  },
});
