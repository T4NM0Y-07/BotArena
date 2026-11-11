import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { getPlan, TRIAL_BOT_LIMIT } from "./lib/plans";
import { botModeValidator } from "./schema";

async function requireUserId(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to manage bots.");
  return userId;
}

export function makeWorkerKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeHost(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function logEvent(
  ctx: MutationCtx,
  bot: { _id: import("./_generated/dataModel").Id<"bots">; ownerId: import("./_generated/dataModel").Id<"users"> },
  level: "info" | "success" | "warn" | "error" | "order",
  message: string,
) {
  return ctx.db.insert("events", {
    ownerId: bot.ownerId,
    botId: bot._id,
    level,
    message,
    createdAt: Date.now(),
  });
}

/** Bots for the command deck, with a live count of open orders. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const bots = await ctx.db
      .query("bots")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();

    return await Promise.all(
      bots.map(async (bot) => {
        const running = await ctx.db
          .query("orders")
          .withIndex("by_bot_status", (q) =>
            q.eq("botId", bot._id).eq("status", "running"),
          )
          .collect();
        const queued = await ctx.db
          .query("orders")
          .withIndex("by_bot_status", (q) =>
            q.eq("botId", bot._id).eq("status", "queued"),
          )
          .collect();
        return {
          _id: bot._id,
          name: bot.name,
          host: bot.host,
          port: bot.port,
          username: bot.username,
          version: bot.version,
          mode: bot.mode,
          status: bot.status,
          statusMessage: bot.statusMessage,
          autoReconnect: bot.autoReconnect,
          lastSeenAt: bot.lastSeenAt,
          ordersCompleted: bot.ordersCompleted,
          createdAt: bot.createdAt,
          openOrders: running.length + queued.length,
        };
      }),
    );
  },
});

/** Single bot, including the worker key so the operator can wire up a worker. */
export const get = query({
  args: { botId: v.id("bots") },
  handler: async (ctx, { botId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const bot = await ctx.db.get(botId);
    if (!bot || bot.ownerId !== userId) return null;
    return bot;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    host: v.string(),
    port: v.number(),
    username: v.string(),
    version: v.string(),
    authMode: v.union(v.literal("offline"), v.literal("microsoft")),
    mode: botModeValidator,
    autoReconnect: v.boolean(),
    server: v.optional(
      v.object({
        motd: v.optional(v.string()),
        version: v.optional(v.string()),
        playersOnline: v.optional(v.number()),
        playersMax: v.optional(v.number()),
        latencyMs: v.optional(v.number()),
        verifiedAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const host = normalizeHost(args.host);
    if (!host || host.includes(":")) {
      throw new Error("Use a hostname like play.example.net (put the port in the port field).");
    }
    const username = args.username.trim();
    if (username.length < 3 || username.length > 16) {
      throw new Error("Minecraft usernames are 3–16 characters.");
    }
    const port = Math.round(args.port);
    if (port < 1 || port > 65535) throw new Error("Port must be between 1 and 65535.");

    const existing = await ctx.db
      .query("bots")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .first();
    const plan =
      subscription?.status === "active" ? getPlan(subscription.planId) : undefined;
    const botLimit = plan?.botLimit ?? TRIAL_BOT_LIMIT;

    if (existing.length >= botLimit) {
      throw new Error(
        plan
          ? `Your ${plan.name} plan includes ${botLimit} bot${botLimit === 1 ? "" : "s"}. Upgrade your plan to add more.`
          : "The free trial includes one bot. Choose a plan to add more to your workspace.",
      );
    }

    const now = Date.now();
    const botId = await ctx.db.insert("bots", {
      ownerId: userId,
      name: args.name.trim() || username,
      host,
      port,
      username,
      version: args.version.trim() || "auto",
      authMode: args.authMode,
      mode: args.mode,
      status: args.mode === "simulated" ? "connecting" : "offline",
      statusMessage:
        args.mode === "simulated"
          ? "Syncing simulated runtime"
          : "Waiting for worker to connect",
      autoReconnect: args.autoReconnect,
      motd: args.server?.motd,
      serverVersion: args.server?.version,
      playersOnline: args.server?.playersOnline,
      playersMax: args.server?.playersMax,
      latencyMs: args.server?.latencyMs,
      verifiedAt: args.server?.verifiedAt,
      workerKey: makeWorkerKey(),
      ordersCompleted: 0,
      createdAt: now,
    });

    if (args.mode === "simulated") {
      await ctx.scheduler.runAfter(2600, internal.bots.finishSync, { botId });
    }

    const bot = await ctx.db.get(botId);
    if (bot) {
      await logEvent(
        ctx,
        bot,
        "success",
        args.mode === "simulated"
          ? `Bot "${bot.name}" created. Syncing the simulated runtime.`
          : `Bot "${bot.name}" created. Start the worker to connect to ${host}:${port}.`,
      );
    }
    return botId;
  },
});

/** Moves a freshly created simulated bot from "syncing" to "online". */
export const finishSync = internalMutation({
  args: { botId: v.id("bots") },
  handler: async (ctx, { botId }) => {
    const bot = await ctx.db.get(botId);
    if (!bot || bot.mode !== "simulated" || bot.status !== "connecting") return;
    await ctx.db.patch(botId, {
      status: "online",
      statusMessage: "Simulated runtime synced. Ready for orders.",
      lastSeenAt: Date.now(),
    });
    await logEvent(ctx, bot, "success", "Runtime synced. The bot is on shift.");
  },
});

export const setMode = mutation({
  args: { botId: v.id("bots"), mode: botModeValidator },
  handler: async (ctx, { botId, mode }) => {
    const userId = await requireUserId(ctx);
    const bot = await ctx.db.get(botId);
    if (!bot || bot.ownerId !== userId) throw new Error("Bot not found.");
    if (bot.mode === mode) return;

    await ctx.db.patch(botId, {
      mode,
      status: mode === "simulated" ? "connecting" : "offline",
      statusMessage:
        mode === "simulated"
          ? "Syncing simulated runtime"
          : "Waiting for worker to connect",
    });

    // Orders queued while the bot was live should start moving right away.
    if (mode === "simulated") {
      await ctx.scheduler.runAfter(1800, internal.bots.finishSync, { botId });
      for (const status of ["queued", "running"] as const) {
        const open = await ctx.db
          .query("orders")
          .withIndex("by_bot_status", (q) => q.eq("botId", botId).eq("status", status))
          .collect();
        for (const order of open) {
          await ctx.scheduler.runAfter(800, internal.orders.tick, {
            orderId: order._id,
          });
        }
      }
    }

    await logEvent(
      ctx,
      bot,
      "warn",
      mode === "simulated"
        ? "Switched to simulation mode. Orders are planned but not played."
        : "Switched to live mode. Start the companion worker to connect.",
    );
  },
});

export const toggleAutoReconnect = mutation({
  args: { botId: v.id("bots") },
  handler: async (ctx, { botId }) => {
    const userId = await requireUserId(ctx);
    const bot = await ctx.db.get(botId);
    if (!bot || bot.ownerId !== userId) throw new Error("Bot not found.");
    await ctx.db.patch(botId, { autoReconnect: !bot.autoReconnect });
    await logEvent(
      ctx,
      bot,
      "info",
      `Auto-reconnect ${bot.autoReconnect ? "disabled" : "enabled"}.`,
    );
  },
});

export const togglePause = mutation({
  args: { botId: v.id("bots") },
  handler: async (ctx, { botId }) => {
    const userId = await requireUserId(ctx);
    const bot = await ctx.db.get(botId);
    if (!bot || bot.ownerId !== userId) throw new Error("Bot not found.");

    const paused = bot.status === "paused";
    await ctx.db.patch(botId, {
      status: paused ? (bot.mode === "simulated" ? "online" : "offline") : "paused",
      statusMessage: paused
        ? bot.mode === "simulated"
          ? "Simulated runtime — no game connection"
          : "Waiting for worker to connect"
        : "Paused by operator",
    });
    await logEvent(
      ctx,
      bot,
      paused ? "success" : "warn",
      paused ? "Runtime resumed. Queued orders are continuing." : "Runtime paused by operator.",
    );
  },
});

export const rotateWorkerKey = mutation({
  args: { botId: v.id("bots") },
  handler: async (ctx, { botId }) => {
    const userId = await requireUserId(ctx);
    const bot = await ctx.db.get(botId);
    if (!bot || bot.ownerId !== userId) throw new Error("Bot not found.");
    const workerKey = makeWorkerKey();
    await ctx.db.patch(botId, { workerKey });
    await logEvent(ctx, bot, "warn", "Worker key rotated. Restart the worker with the new key.");
    return workerKey;
  },
});

export const remove = mutation({
  args: { botId: v.id("bots") },
  handler: async (ctx, { botId }) => {
    const userId = await requireUserId(ctx);
    const bot = await ctx.db.get(botId);
    if (!bot || bot.ownerId !== userId) throw new Error("Bot not found.");

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_bot", (q) => q.eq("botId", botId))
      .collect();
    for (const order of orders) await ctx.db.delete(order._id);

    const events = await ctx.db
      .query("events")
      .withIndex("by_bot", (q) => q.eq("botId", botId))
      .collect();
    for (const event of events) await ctx.db.delete(event._id);

    await ctx.db.delete(botId);
  },
});
