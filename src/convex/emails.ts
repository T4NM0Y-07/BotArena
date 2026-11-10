import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { sendBrandedEmail, welcomeEmail } from "./lib/brandedEmail";

/** A welcome mail is only for accounts verified within this window. */
const WELCOME_WINDOW_MS = 30 * 60 * 1000;

/**
 * Claims the welcome send so concurrent calls and repeat sign-ins can't send
 * a second copy. Runs before delivery; the action releases it if the gateway
 * fails so a later sign-in can retry.
 */
export const claimWelcomeEmail = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user?.email) return null;
    if (user.isAnonymous) return null;
    if (user.welcomeEmailSentAt) return null;
    if (Date.now() - user._creationTime > WELCOME_WINDOW_MS) return null;

    await ctx.db.patch(userId, { welcomeEmailSentAt: Date.now() });
    return { email: user.email, name: user.name ?? null };
  },
});

export const releaseWelcomeClaim = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { welcomeEmailSentAt: undefined });
  },
});

function safeOrigin(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export const sendWelcome = action({
  args: { appUrl: v.optional(v.string()) },
  handler: async (ctx, { appUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { sent: false as const, reason: "signed-out" };

    const claim = await ctx.runMutation(internal.emails.claimWelcomeEmail, {
      userId,
    });
    if (!claim) return { sent: false as const, reason: "not-eligible" };

    try {
      await sendBrandedEmail({
        to: claim.email,
        ...welcomeEmail({
          email: claim.email,
          name: claim.name,
          appUrl: safeOrigin(appUrl ?? ""),
        }),
      });
      return { sent: true as const };
    } catch (error) {
      // A failed welcome must never block the operator from reaching the console.
      console.error("welcome email failed", error);
      await ctx.runMutation(internal.emails.releaseWelcomeClaim, { userId });
      return { sent: false as const, reason: "send-failed" };
    }
  },
});
