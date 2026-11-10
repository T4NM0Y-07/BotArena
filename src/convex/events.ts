import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

/** Activity log for one bot, newest first. */
export const listByBot = query({
  args: { botId: v.id("bots") },
  handler: async (ctx, { botId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const bot = await ctx.db.get(botId);
    if (!bot || bot.ownerId !== userId) return [];

    return await ctx.db
      .query("events")
      .withIndex("by_bot", (q) => q.eq("botId", botId))
      .order("desc")
      .take(60);
  },
});

/** Workspace activity feed across all bots. */
export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const events = await ctx.db
      .query("events")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .take(14);

    return await Promise.all(
      events.map(async (event) => {
        const bot = await ctx.db.get(event.botId);
        return { ...event, botName: bot?.name ?? "Deleted bot" };
      }),
    );
  },
});
