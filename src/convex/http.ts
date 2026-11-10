import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

const http = httpRouter();

auth.addHttpRoutes(http);

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Sanitises the worker's inventory snapshot before it reaches the validator. */
function parseLoadout(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.items)) return undefined;

  const items = record.items.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const slotEntry = entry as Record<string, unknown>;
    if (typeof slotEntry.slot !== "number" || typeof slotEntry.item !== "string") {
      return [];
    }
    return [
      {
        slot: Math.round(slotEntry.slot),
        item: slotEntry.item.slice(0, 64),
        count: Math.max(1, Math.round(Number(slotEntry.count) || 1)),
      },
    ];
  });

  return {
    heldSlot: Math.max(0, Math.min(8, Math.round(Number(record.heldSlot) || 0))),
    items: items.slice(0, 64),
  };
}

/**
 * HTTP bridge for the companion Mineflayer worker.
 * The worker polls these routes with its bot key, claims one order at a time,
 * and reports progress back so the console stays live 24/7.
 */
http.route({
  path: "/worker/claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readJson(request);
    const key = typeof body?.key === "string" ? body.key : "";
    if (!key) return reply({ error: "Missing worker key." }, 400);

    try {
      const result = await ctx.runMutation(internal.orders.claim, { key });
      if (!result) return reply({ error: "Unknown worker key." }, 404);
      return reply({ ok: true, ...result });
    } catch (error) {
      return reply({ error: error instanceof Error ? error.message : "Claim failed." }, 400);
    }
  }),
});

http.route({
  path: "/worker/report",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readJson(request);
    const key = typeof body?.key === "string" ? body.key : "";
    const orderId = typeof body?.orderId === "string" ? body.orderId : "";
    const status = body?.status;
    if (!key || !orderId) return reply({ error: "Missing key or orderId." }, 400);
    if (status !== "running" && status !== "done" && status !== "failed") {
      return reply({ error: "status must be running, done or failed." }, 400);
    }

    try {
      const ok = await ctx.runMutation(internal.orders.report, {
        key,
        orderId: orderId as Id<"orders">,
        status,
        step: typeof body?.step === "number" ? body.step : undefined,
        progress: typeof body?.progress === "number" ? body.progress : undefined,
        message: typeof body?.message === "string" ? body.message : undefined,
      });
      return reply({ ok });
    } catch (error) {
      return reply({ error: error instanceof Error ? error.message : "Report failed." }, 400);
    }
  }),
});

http.route({
  path: "/worker/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readJson(request);
    const key = typeof body?.key === "string" ? body.key : "";
    const state = body?.state;
    if (!key) return reply({ error: "Missing worker key." }, 400);
    if (state !== "connecting" && state !== "online" && state !== "offline" && state !== "error") {
      return reply({ error: "state must be connecting, online, offline or error." }, 400);
    }

    try {
      const ok = await ctx.runMutation(internal.orders.heartbeat, {
        key,
        state,
        message: typeof body?.message === "string" ? body.message : undefined,
        loadout: parseLoadout(body?.loadout),
      });
      return reply({ ok });
    } catch (error) {
      return reply({ error: error instanceof Error ? error.message : "Heartbeat failed." }, 400);
    }
  }),
});

export default http;
