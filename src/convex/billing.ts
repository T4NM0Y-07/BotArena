import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPlan, TRIAL_BOT_LIMIT } from "./lib/plans";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** The active subscription for the signed-in workspace, if any. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .first();

    return subscription && subscription.status === "active" ? subscription : null;
  },
});

/** Plan limits used by the setup wizard and the dashboard. */
export const entitlement = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        plan: null,
        botLimit: TRIAL_BOT_LIMIT,
        used: 0,
        trial: true,
        renewsAt: null,
      };
    }

    const [subscription, bots] = await Promise.all([
      ctx.db
        .query("subscriptions")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .order("desc")
        .first(),
      ctx.db
        .query("bots")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect(),
    ]);

    const plan =
      subscription?.status === "active" ? getPlan(subscription.planId) : undefined;

    return {
      plan: plan ?? null,
      botLimit: plan?.botLimit ?? TRIAL_BOT_LIMIT,
      used: bots.length,
      trial: !plan,
      renewsAt: subscription?.renewsAt ?? null,
    };
  },
});

/**
 * Preview checkout: records the chosen plan and activates its limits.
 *
 * Card processing is intentionally not wired up in this preview. When Stripe
 * (or another PSP) is connected, create the checkout session here first and
 * only insert the subscription from the verified webhook.
 */
export const checkout = mutation({
  args: { planId: v.string(), email: v.string() },
  handler: async (ctx, { planId, email }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to activate a plan.");

    const plan = getPlan(planId);
    if (!plan) throw new Error("That plan does not exist.");

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      throw new Error("Enter a valid billing email.");
    }

    const previous = await ctx.db
      .query("subscriptions")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const now = Date.now();
    for (const subscription of previous) {
      if (subscription.status === "active") {
        await ctx.db.patch(subscription._id, { status: "cancelled" });
      }
    }

    const renewsAt = now + MONTH_MS;
    const subscriptionId = await ctx.db.insert("subscriptions", {
      ownerId: userId,
      planId: plan.id,
      planName: plan.name,
      priceCents: plan.priceCents,
      interval: plan.interval,
      status: "active",
      email: cleanEmail,
      startedAt: now,
      renewsAt,
      sandbox: true,
    });

    return { subscriptionId, planId: plan.id, planName: plan.name, renewsAt };
  },
});
