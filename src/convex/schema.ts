import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const botStatusValidator = v.union(
  v.literal("offline"),
  v.literal("connecting"),
  v.literal("online"),
  v.literal("paused"),
  v.literal("error"),
);
export type BotStatus = Infer<typeof botStatusValidator>;

export const orderStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
  v.literal("cancelled"),
);
export type OrderStatus = Infer<typeof orderStatusValidator>;

export const botModeValidator = v.union(
  v.literal("simulated"),
  v.literal("live"),
);
export type BotMode = Infer<typeof botModeValidator>;

export const eventLevelValidator = v.union(
  v.literal("info"),
  v.literal("success"),
  v.literal("warn"),
  v.literal("error"),
  v.literal("order"),
);
export type EventLevel = Infer<typeof eventLevelValidator>;

export const planStepValidator = v.object({
  title: v.string(),
  detail: v.string(),
});

export const orderParamsValidator = v.object({
  quantity: v.optional(v.number()),
  target: v.optional(v.string()),
  text: v.optional(v.string()),
});

/**
 * Inventory snapshot reported by the companion worker.
 * Slots 9–35 are the main inventory, 36–44 the hotbar, 45 the off hand and
 * 100–103 the armor pieces (helmet → boots).
 */
export const loadoutItemValidator = v.object({
  slot: v.number(),
  item: v.string(),
  count: v.number(),
});

export const loadoutValidator = v.object({
  heldSlot: v.number(),
  items: v.array(loadoutItemValidator),
});
export type Loadout = Infer<typeof loadoutValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      /** Set once the branded welcome mail has been claimed. */
      welcomeEmailSentAt: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /** One Minecraft account the operator controls. */
    bots: defineTable({
      ownerId: v.id("users"),
      name: v.string(),
      host: v.string(),
      port: v.number(),
      username: v.string(),
      version: v.string(),
      authMode: v.union(v.literal("offline"), v.literal("microsoft")),
      mode: botModeValidator,
      status: botStatusValidator,
      statusMessage: v.optional(v.string()),
      autoReconnect: v.boolean(),
      /** Last server status ping, captured during setup. */
      motd: v.optional(v.string()),
      serverVersion: v.optional(v.string()),
      playersOnline: v.optional(v.number()),
      playersMax: v.optional(v.number()),
      latencyMs: v.optional(v.number()),
      verifiedAt: v.optional(v.number()),
      /** Latest equipment/inventory snapshot from the worker. */
      loadout: v.optional(loadoutValidator),
      loadoutAt: v.optional(v.number()),
      /** Secret the companion worker uses to claim orders. */
      workerKey: v.string(),
      workerConnectedAt: v.optional(v.number()),
      lastSeenAt: v.optional(v.number()),
      ordersCompleted: v.number(),
      createdAt: v.number(),
    })
      .index("by_owner", ["ownerId"])
      .index("by_workerKey", ["workerKey"]),

    /** A plain-English instruction plus the plan derived from it. */
    orders: defineTable({
      ownerId: v.id("users"),
      botId: v.id("bots"),
      prompt: v.string(),
      intent: v.string(),
      label: v.string(),
      reply: v.string(),
      plan: v.array(planStepValidator),
      params: v.optional(orderParamsValidator),
      status: orderStatusValidator,
      step: v.number(),
      progress: v.number(),
      result: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      finishedAt: v.optional(v.number()),
    })
      .index("by_bot", ["botId"])
      .index("by_owner", ["ownerId"])
      .index("by_bot_status", ["botId", "status"]),

    /** Telemetry / activity log lines shown in the console. */
    events: defineTable({
      ownerId: v.id("users"),
      botId: v.id("bots"),
      level: eventLevelValidator,
      message: v.string(),
      createdAt: v.number(),
    })
      .index("by_bot", ["botId"])
      .index("by_owner", ["ownerId"]),

    /** Plan chosen at checkout. One active subscription per workspace. */
    subscriptions: defineTable({
      ownerId: v.id("users"),
      planId: v.string(),
      planName: v.string(),
      priceCents: v.number(),
      interval: v.string(),
      status: v.union(v.literal("active"), v.literal("cancelled")),
      email: v.string(),
      startedAt: v.number(),
      renewsAt: v.number(),
      sandbox: v.boolean(),
    }).index("by_owner", ["ownerId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
