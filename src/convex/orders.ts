import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { logEvent } from "./bots";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { loadoutValidator } from "./schema";
import { parseOrder } from "./lib/parseOrder";

async function requireUserId(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Sign in to send orders.");
  return userId;
}

async function requireOwnedBot(ctx: MutationCtx, botId: import("./_generated/dataModel").Id<"bots">) {
  const userId = await requireUserId(ctx);
  const bot = await ctx.db.get(botId);
  if (!bot || bot.ownerId !== userId) throw new Error("Bot not found.");
  return bot;
}

/** Orders for one bot, newest first. */
export const listByBot = query({
  args: { botId: v.id("bots") },
  handler: async (ctx, { botId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const bot = await ctx.db.get(botId);
    if (!bot || bot.ownerId !== userId) return [];

    return await ctx.db
      .query("orders")
      .withIndex("by_bot", (q) => q.eq("botId", botId))
      .order("desc")
      .take(40);
  },
});

/** Workspace-wide counters for the command deck. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { active: 0, completed: 0, failed: 0, last24h: 0 };

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .take(500);

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return {
      active: orders.filter((o) => o.status === "queued" || o.status === "running").length,
      completed: orders.filter((o) => o.status === "done").length,
      failed: orders.filter((o) => o.status === "failed").length,
      last24h: orders.filter((o) => o.createdAt >= dayAgo).length,
    };
  },
});

/**
 * Turns a plain-English instruction into a plan and queues it.
 * In simulation mode the plan is walked by an internal tick loop; in live mode
 * the companion worker claims it over the HTTP bridge.
 */
export const create = mutation({
  args: { botId: v.id("bots"), prompt: v.string() },
  handler: async (ctx, { botId, prompt }) => {
    const bot = await requireOwnedBot(ctx, botId);
    const cleaned = prompt.trim().slice(0, 280);
    if (cleaned.length < 3) throw new Error("Give the bot at least a few words to work with.");
    if (bot.status === "paused") {
      throw new Error("This bot is paused. Resume the runtime before sending orders.");
    }

    const parsed = parseOrder(cleaned);
    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      ownerId: bot.ownerId,
      botId,
      prompt: cleaned,
      intent: parsed.intent,
      label: parsed.label,
      reply: parsed.reply,
      plan: parsed.plan,
      params: parsed.params,
      status: "queued",
      step: 0,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    });

    await logEvent(ctx, bot, "order", `Order received → ${parsed.label}: “${cleaned}”`);

    if (bot.mode === "simulated") {
      await ctx.scheduler.runAfter(1200, internal.orders.tick, { orderId });
    } else if (bot.status !== "online") {
      await logEvent(ctx, bot, "warn", "Order queued. It will start when the worker connects.");
    } else {
      await logEvent(ctx, bot, "info", "Order handed to the live worker queue.");
    }

    return orderId;
  },
});

export const cancel = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const userId = await requireUserId(ctx);
    const order = await ctx.db.get(orderId);
    if (!order || order.ownerId !== userId) throw new Error("Order not found.");
    if (order.status !== "queued" && order.status !== "running") {
      throw new Error("Only queued or running orders can be cancelled.");
    }
    const now = Date.now();
    await ctx.db.patch(orderId, {
      status: "cancelled",
      result: "Cancelled by operator.",
      finishedAt: now,
      updatedAt: now,
    });
    const bot = await ctx.db.get(order.botId);
    if (bot) await logEvent(ctx, bot, "warn", `Order cancelled: ${order.label}.`);
  },
});

/** Simulation driver: advances one order one step at a time. */
export const tick = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order || (order.status !== "queued" && order.status !== "running")) return;

    const bot = await ctx.db.get(order.botId);
    if (!bot || bot.mode !== "simulated") return;

    if (bot.status === "paused") {
      await ctx.scheduler.runAfter(4000, internal.orders.tick, { orderId });
      return;
    }

    const now = Date.now();
    const total = Math.max(order.plan.length, 1);

    if (order.status === "queued") {
      const running = await ctx.db
        .query("orders")
        .withIndex("by_bot_status", (q) => q.eq("botId", bot._id).eq("status", "running"))
        .first();
      if (running && running._id !== order._id) {
        await ctx.scheduler.runAfter(3000, internal.orders.tick, { orderId });
        return;
      }

      const first = order.plan[0];
      await ctx.db.patch(orderId, {
        status: "running",
        step: 1,
        progress: Math.round(100 / total),
        updatedAt: now,
      });
      await ctx.db.patch(bot._id, { status: "online", lastSeenAt: now });
      await logEvent(
        ctx,
        bot,
        "info",
        `1/${total} ${first?.title ?? "Start"} — ${first?.detail ?? order.label}`,
      );
      await ctx.scheduler.runAfter(3200, internal.orders.tick, { orderId });
      return;
    }

    const nextStep = order.step + 1;
    if (nextStep <= total) {
      const step = order.plan[nextStep - 1];
      await ctx.db.patch(orderId, {
        step: nextStep,
        progress: Math.round((nextStep / total) * 100),
        updatedAt: now,
      });
      await logEvent(
        ctx,
        bot,
        "info",
        `${nextStep}/${total} ${step?.title ?? "Step"} — ${step?.detail ?? ""}`,
      );
      await ctx.scheduler.runAfter(3200, internal.orders.tick, { orderId });
      return;
    }

    await ctx.db.patch(orderId, {
      status: "done",
      progress: 100,
      result: `Completed ${total}/${total} steps.`,
      finishedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(bot._id, {
      ordersCompleted: bot.ordersCompleted + 1,
      lastSeenAt: now,
    });
    await logEvent(ctx, bot, "success", `Order complete → ${order.label}. Bot says: “${order.reply}”`);
  },
});

/* ------------------------------ worker bridge ----------------------------- */

/** Called by the HTTP bridge when a worker asks for work. */
export const claim = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_workerKey", (q) => q.eq("workerKey", key))
      .unique();
    if (!bot) return null;

    const now = Date.now();
    const connection = {
      host: bot.host,
      port: bot.port,
      username: bot.username,
      version: bot.version,
      authMode: bot.authMode,
      autoReconnect: bot.autoReconnect,
      paused: bot.status === "paused",
      mode: bot.mode,
    };

    // Connection status is owned by the heartbeat route; claiming only proves
    // the worker is alive and polling.
    await ctx.db.patch(bot._id, { lastSeenAt: now });

    if (bot.status === "paused") return { bot: connection, order: null };

    const next = await ctx.db
      .query("orders")
      .withIndex("by_bot_status", (q) => q.eq("botId", bot._id).eq("status", "queued"))
      .first();
    if (!next) return { bot: connection, order: null };

    await ctx.db.patch(next._id, {
      status: "running",
      step: 0,
      progress: 5,
      updatedAt: now,
    });
    await logEvent(ctx, bot, "info", `Live worker claimed “${next.prompt}”.`);

    return {
      bot: connection,
      order: {
        id: next._id,
        prompt: next.prompt,
        intent: next.intent,
        label: next.label,
        plan: next.plan,
        params: next.params ?? {},
      },
    };
  },
});

/** Called by the HTTP bridge with progress from the game. */
export const report = internalMutation({
  args: {
    key: v.string(),
    orderId: v.id("orders"),
    status: v.union(v.literal("running"), v.literal("done"), v.literal("failed")),
    step: v.optional(v.number()),
    progress: v.optional(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_workerKey", (q) => q.eq("workerKey", args.key))
      .unique();
    if (!bot) return false;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.botId !== bot._id) return false;
    if (order.status === "cancelled") return false;

    const now = Date.now();
    const progress = Math.max(0, Math.min(100, Math.round(args.progress ?? order.progress)));
    const step = Math.max(0, Math.round(args.step ?? order.step));

    if (args.status === "done") {
      await ctx.db.patch(order._id, {
        status: "done",
        progress: 100,
        step: order.plan.length,
        result: args.message ?? "Completed by live worker.",
        finishedAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(bot._id, {
        ordersCompleted: bot.ordersCompleted + 1,
        lastSeenAt: now,
        status: "online",
      });
      await logEvent(ctx, bot, "success", args.message ?? `Live order complete → ${order.label}.`);
      return true;
    }

    if (args.status === "failed") {
      await ctx.db.patch(order._id, {
        status: "failed",
        result: args.message ?? "Worker reported a failure.",
        finishedAt: now,
        updatedAt: now,
      });
      await logEvent(ctx, bot, "error", args.message ?? `Order failed → ${order.label}.`);
      return true;
    }

    await ctx.db.patch(order._id, { step, progress, updatedAt: now });
    if (args.message) await logEvent(ctx, bot, "info", args.message);
    return true;
  },
});

/** Worker heartbeat; also logs connection changes once, not on every ping. */
export const heartbeat = internalMutation({
  args: {
    key: v.string(),
    state: v.union(
      v.literal("connecting"),
      v.literal("online"),
      v.literal("offline"),
      v.literal("error"),
    ),
    message: v.optional(v.string()),
    loadout: v.optional(loadoutValidator),
  },
  handler: async (ctx, { key, state, message, loadout }) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_workerKey", (q) => q.eq("workerKey", key))
      .unique();
    if (!bot) return false;

    const now = Date.now();
    const changed = bot.status !== state;
    await ctx.db.patch(bot._id, {
      status: bot.status === "paused" ? "paused" : state,
      lastSeenAt: now,
      ...(loadout ? { loadout, loadoutAt: now } : {}),
      statusMessage:
        message ??
        (state === "online"
          ? `Worker connected · ${bot.host}:${bot.port}`
          : state === "connecting"
            ? `Connecting to ${bot.host}:${bot.port}`
            : state === "error"
              ? "Worker error — check the worker logs"
              : "Waiting for worker to connect"),
      workerConnectedAt:
        state === "online" && bot.status !== "online"
          ? now
          : bot.workerConnectedAt,
    });

    if (changed) {
      const level = state === "online" ? "success" : state === "error" ? "error" : "warn";
      await logEvent(ctx, bot, level, message ?? `Worker state: ${state}.`);
    } else if (message) {
      await logEvent(ctx, bot, "info", message);
    }
    return true;
  },
});
