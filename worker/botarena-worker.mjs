#!/usr/bin/env node
/**
 * BotArena companion worker.
 *
 * Keeps one Minecraft account connected 24/7, claims plain-English orders from
 * the BotArena console over HTTPS, executes them with Mineflayer, and reports
 * progress back so the web console stays live.
 *
 *   BOTARENA_URL=https://your-deployment.convex.site \
 *   BOTARENA_KEY=<bot key from the console> \
 *   node botarena-worker.mjs
 */

import net from "node:net";
import mineflayer from "mineflayer";

let pathfinderModule = null;
try {
  pathfinderModule = await import("mineflayer-pathfinder");
} catch {
  console.warn("[worker] mineflayer-pathfinder not installed — movement falls back to nearby blocks.");
}

const BASE_URL = (process.env.BOTARENA_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.BOTARENA_KEY ?? "";
const POLL_MS = Number(process.env.BOTARENA_POLL_MS ?? 4000);
const HEARTBEAT_MS = Number(process.env.BOTARENA_HEARTBEAT_MS ?? 10000);
const CONNECT_TIMEOUT_MS = Number(process.env.BOTARENA_CONNECT_TIMEOUT_MS ?? 8000);

if (!BASE_URL || !KEY) {
  console.error("[worker] Set BOTARENA_URL and BOTARENA_KEY (copy both from the bot console).");
  process.exit(1);
}

// Bot keys are 16 random bytes hex-encoded, so always 32 lowercase hex characters.
// A mangled or wrong key would otherwise poll "Unknown worker key" forever.
if (!/^[0-9a-f]{32}$/.test(KEY)) {
  console.error(
    `[worker] BOTARENA_KEY is not a valid bot key: expected 32 lowercase hex characters, got ${KEY.length} character(s).`,
  );
  if (/^[0-9a-f]{32}$/i.test(KEY)) {
    console.error("[worker] Bot keys are lowercase hex only — re-copy the key instead of retyping it.");
  }
  console.error(
    "[worker] Open the bot page → Worker bridge panel, copy the key (Rotate key if unsure), and pass it as BOTARENA_KEY.",
  );
  process.exit(1);
}

const state = {
  bot: null,
  connected: false,
  config: null,
  current: null,
  pendingOrder: null,
  timers: [],
  routine: 0,
  reconnectAttempts: 0,
  connecting: false,
  reachError: null,
};

const BLOCK_NAMES = {
  "oak logs": "oak_log",
  "birch logs": "birch_log",
  "spruce logs": "spruce_log",
  "jungle logs": "jungle_log",
  "acacia logs": "acacia_log",
  "dark oak logs": "dark_oak_log",
  "mangrove logs": "mangrove_log",
  "cherry logs": "cherry_log",
  "iron ore": "iron_ore",
  "gold ore": "gold_ore",
  "diamond ore": "diamond_ore",
  "coal ore": "coal_ore",
  "copper ore": "copper_ore",
  "emerald ore": "emerald_ore",
  "redstone ore": "redstone_ore",
  "lapis ore": "lapis_ore",
  "ancient debris": "ancient_debris",
  cobblestone: "stone",
  dirt: "dirt",
  sand: "sand",
  gravel: "gravel",
  obsidian: "obsidian",
  wheat: "wheat",
  carrots: "carrots",
  potatoes: "potatoes",
  beetroot: "beetroot",
  melon: "melon",
  pumpkin: "pumpkin",
  "sugar cane": "sugar_cane",
  wool: "white_wool",
};

const HOSTILE = /zombie|skeleton|creeper|spider|enderman|witch|slime|phantom|pillager|vindicator|drowned|husk|stray|blaze|magma|ravager|warden/i;
const KEEP_ITEMS = /pickaxe|axe|shovel|sword|hoe|torch|food|bread|apple|cooked|bucket|shield|helmet|chestplate|leggings|boots/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

function addTimer(timer) {
  state.timers.push(timer);
}

function clearTimers() {
  for (const timer of state.timers) clearInterval(timer);
  state.timers = [];
}

/** Cancels any standing routine (patrol, follow) and invalidates its timers. */
function stopRoutines() {
  state.routine += 1;
  clearTimers();
}

async function api(path, body = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: KEY, ...body }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data;
}

/**
 * Equipment + inventory snapshot for the console inspector.
 * Window slots 9–44 keep their ids, off hand is 45 and armor is 100–103.
 */
function snapshotLoadout() {
  const bot = state.bot;
  if (!bot || !state.connected) return undefined;

  const armor = { 5: 100, 6: 101, 7: 102, 8: 103 };
  const items = [];
  const slots = bot.inventory?.slots ?? [];

  for (let index = 5; index < slots.length; index += 1) {
    const item = slots[index];
    if (!item) continue;
    const slot = armor[index] ?? (index === 45 || (index >= 9 && index <= 44) ? index : null);
    if (slot === null) continue;
    items.push({ slot, item: item.name, count: item.count ?? 1 });
  }

  return { heldSlot: bot.quickBarSlot ?? 0, items };
}

async function reportState(nextState, message) {
  try {
    await api("/worker/heartbeat", {
      state: nextState,
      message,
      loadout: snapshotLoadout(),
    });
  } catch (error) {
    log("[worker] heartbeat failed:", error.message);
  }
}

async function report(payload) {
  if (!state.current) return;
  try {
    await api("/worker/report", { orderId: state.current.id, ...payload });
  } catch (error) {
    log("[worker] report failed:", error.message);
  }
}

/**
 * Cheap TCP probe so a firewalled or wrong host:port fails in seconds with a
 * clear message, instead of hanging until mineflayer's own connect timeout.
 */
function probeTcp(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const finish = (error) => {
      socket.removeAllListeners();
      socket.once("error", () => {});
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(null));
    socket.once("timeout", () => finish(new Error(`timed out after ${timeoutMs} ms`)));
    socket.once("error", (error) => finish(error));
  });
}

async function connect(config) {
  if (state.bot || state.connecting) return;
  state.config = config;
  state.connecting = true;
  try {
    // Retries after a failure stay quiet; the error below is logged once.
    if (!state.reachError) log(`[worker] checking ${config.host}:${config.port}`);
    await probeTcp(config.host, config.port, CONNECT_TIMEOUT_MS);
    state.reachError = null;
  } catch (error) {
    const detail = error.code ?? error.message;
    const message =
      `Cannot reach ${config.host}:${config.port} (${detail}). Check the host, port, firewall or VPN; ` +
      "raise BOTARENA_CONNECT_TIMEOUT_MS if the server is only slow.";
    if (state.reachError !== message) {
      state.reachError = message;
      log(`[worker] ${message}`);
      void reportState("error", message);
    }
    return;
  } finally {
    state.connecting = false;
  }

  log(`[worker] connecting to ${config.host}:${config.port} as ${config.username}`);
  void reportState("connecting", `Connecting to ${config.host}:${config.port}`);

  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    auth: config.authMode === "microsoft" ? "microsoft" : "offline",
    version: config.version === "auto" ? false : config.version,
  });
  state.bot = bot;

  if (pathfinderModule) bot.loadPlugin(pathfinderModule.pathfinder);

  bot.once("spawn", () => {
    state.connected = true;
    state.reconnectAttempts = 0;
    state.reachError = null;
    if (pathfinderModule) {
      const movements = new pathfinderModule.Movements(bot);
      movements.canDig = false;
      state.movements = movements;
    }
    log(`[worker] spawned as ${bot.username}`);
    void reportState("online", `Connected to ${config.host}:${config.port} as ${bot.username}`);
    if (state.pendingOrder) {
      const pending = state.pendingOrder;
      state.pendingOrder = null;
      void execute(pending);
    }
  });

  bot.on("end", (reason) => {
    state.connected = false;
    state.bot = null;
    state.current = null;
    stopRoutines();
    log(`[worker] disconnected: ${reason}`);
    void reportState("offline", `Disconnected: ${reason}`);
    if (state.config?.autoReconnect && !state.shuttingDown) {
      state.reconnectAttempts = Math.min(state.reconnectAttempts + 1, 6);
      const delay = Math.min(30000, 2000 * 2 ** state.reconnectAttempts);
      log(`[worker] reconnect in ${Math.round(delay / 1000)}s`);
      setTimeout(() => void connect(state.config), delay);
    }
  });

  bot.on("kicked", (reason) => {
    log("[worker] kicked:", reason);
    void reportState("error", `Kicked: ${reason}`);
  });

  bot.on("error", (error) => {
    log("[worker] error:", error.message);
    void reportState("error", error.message);
  });

  bot.on("death", () => {
    log("[worker] died, respawning");
    bot.chat("Respawned and back on shift.");
  });
}

function requireBot() {
  if (!state.bot || !state.connected) throw new Error("Not connected to the server.");
  return state.bot;
}

/**
 * bot.quit only exists once mineflayer's kick plugin is loaded, so a bot that
 * never finished connecting has no quit(). bot.end is always defined.
 */
function closeBot(reason = "Worker stopped") {
  const bot = state.bot;
  if (!bot) return;
  if (typeof bot.quit === "function") bot.quit(reason);
  else if (typeof bot.end === "function") bot.end(reason);
}

async function goNear(position, range = 1) {
  const bot = requireBot();
  if (!bot.pathfinder || !state.movements || !pathfinderModule) return;
  const { goals } = pathfinderModule;
  bot.pathfinder.setMovements(state.movements);
  await bot.pathfinder.goto(new goals.GoalNear(position.x, position.y, position.z, range));
}

async function mineBlocks(blockName, quantity) {
  const bot = requireBot();
  const itemName = BLOCK_NAMES[blockName] ?? blockName.replace(/\s+/g, "_");
  const definition = bot.registry.blocksByName[itemName];
  if (!definition) throw new Error(`Unknown block "${blockName}" for this server version.`);

  const deadline = Date.now() + 5 * 60 * 1000;
  let mined = 0;
  while (mined < quantity && Date.now() < deadline) {
    const block = bot.findBlock({ matching: definition.id, maxDistance: 48 });
    if (!block) break;
    try {
      await goNear(block.position);
      await bot.dig(block);
      mined += 1;
    } catch (error) {
      log(`[worker] dig failed: ${error.message}`);
      break;
    }
  }
  return mined;
}

async function harvestCrops(quantity) {
  const bot = requireBot();
  const cropNames = new Set(["wheat", "carrots", "potatoes", "beetroots", "melon", "pumpkin"]);
  const deadline = Date.now() + 4 * 60 * 1000;
  let harvested = 0;

  while (harvested < quantity && Date.now() < deadline) {
    const block = bot.findBlock({
      matching: (block) => cropNames.has(block.name ?? "") && block.metadata >= 7,
      maxDistance: 48,
    });
    if (!block) break;
    try {
      await goNear(block.position);
      await bot.dig(block);
      harvested += 1;
    } catch (error) {
      log(`[worker] harvest failed: ${error.message}`);
      break;
    }
  }
  return harvested;
}

async function depositLoot() {
  const bot = requireBot();
  const chestBlock = bot.findBlock({
    matching: (block) => block.name === "chest" || block.name === "trapped_chest",
    maxDistance: 64,
  });
  if (!chestBlock) return { stored: 0, found: false };

  await goNear(chestBlock.position, 2);
  const chest = await bot.openContainer(chestBlock);
  let stored = 0;
  try {
    for (const item of bot.inventory.items()) {
      if (KEEP_ITEMS.test(item.name)) continue;
      await chest.deposit(item.type, null, item.count);
      stored += item.count;
    }
  } finally {
    chest.close();
  }
  return { stored, found: true };
}

function startGuard() {
  const bot = requireBot();
  clearTimers();
  const token = state.routine;
  const timer = setInterval(() => {
    if (!state.bot || state.routine !== token) {
      clearInterval(timer);
      return;
    }
    const hostile = bot.nearestEntity((entity) => HOSTILE.test(entity.name ?? ""));
    if (!hostile) return;
    const distance = hostile.position.distanceTo(bot.entity.position);
    if (distance < 12) {
      bot.lookAt(hostile.position.offset(0, 1.4, 0), true);
      bot.attack(hostile);
    }
  }, 1200);
  addTimer(timer);
}

function startFollow(targetName) {
  const bot = requireBot();
  if (!pathfinderModule) {
    bot.chat("I need my pathfinder module to follow you.");
    return;
  }
  const { goals } = pathfinderModule;
  clearTimers();
  const token = state.routine;
  const timer = setInterval(() => {
    if (!state.bot || state.routine !== token) {
      clearInterval(timer);
      bot.pathfinder?.setGoal(null);
      return;
    }
    const candidates = Object.values(bot.players);
    const target =
      candidates.find((player) => player.username === targetName) ??
      candidates.find((player) => player.username !== bot.username && player.entity);
    if (!target?.entity) return;
    bot.pathfinder.setMovements(state.movements);
    bot.pathfinder.setGoal(new goals.GoalFollow(target.entity, 2), true);
  }, 1500);
  addTimer(timer);
}

async function wander() {
  const bot = requireBot();
  if (!bot.pathfinder || !pathfinderModule) return;
  const { goals } = pathfinderModule;
  const angle = Math.random() * Math.PI * 2;
  const distance = 24 + Math.random() * 24;
  const target = bot.entity.position.offset(
    Math.cos(angle) * distance,
    0,
    Math.sin(angle) * distance,
  );
  bot.pathfinder.setMovements(state.movements);
  await bot.pathfinder.goto(new goals.GoalNear(target.x, target.y, target.z, 2)).catch(() => {});
}

async function findBedAndSleep() {
  const bot = requireBot();
  const bed = bot.findBlock({
    matching: (block) => /_bed$/.test(block.name ?? ""),
    maxDistance: 32,
  });
  if (!bed) {
    bot.chat("No bed nearby — holding position until morning.");
    return;
  }
  await goNear(bed.position, 1);
  await bot.sleep(bed).catch(() => {});
}

/** Runs the real sub-action for one plan step, when the worker supports it. */
async function performStep(order, stepIndex) {
  const bot = state.bot;
  if (!bot) return;
  const params = order.params ?? {};
  const quantity = params.quantity ?? 16;

  switch (order.intent) {
    case "stop": {
      bot.pathfinder?.setGoal(null);
      bot.clearControlStates();
      stopRoutines();
      return;
    }
    case "chat": {
      if (stepIndex === 0) bot.chat(String(params.text ?? order.reply ?? "Hello."));
      return;
    }
    case "sleep": {
      if (stepIndex === 0) await findBedAndSleep();
      return;
    }
    case "follow": {
      if (stepIndex === 0) startFollow(params.target ?? "");
      return;
    }
    case "guard": {
      if (stepIndex === 0) startGuard();
      return;
    }
    case "gather": {
      if (stepIndex === 0) {
        const found = bot.findBlock({
          matching: bot.registry.blocksByName[BLOCK_NAMES[params.target] ?? ""]?.id ?? -1,
          maxDistance: 64,
        });
        if (!found) throw new Error(`No ${params.target} found within 64 blocks.`);
        await goNear(found.position, 3).catch(() => {});
      }
      if (stepIndex === 1) {
        const mined = await mineBlocks(params.target ?? "cobblestone", quantity);
        bot.chat(`Got ${mined} ${params.target}.`);
        if (mined === 0) throw new Error(`Could not reach any ${params.target}.`);
      }
      if (stepIndex === 2) await depositLoot();
      if (stepIndex === 3) bot.chat(order.reply ?? "Deposited and done.");
      return;
    }
    case "farm": {
      if (stepIndex === 1) {
        const harvested = await harvestCrops(quantity);
        bot.chat(`Harvested ${harvested} crops.`);
      }
      if (stepIndex === 3) await depositLoot();
      return;
    }
    case "deliver": {
      if (stepIndex === 2) {
        const result = await depositLoot();
        if (!result.found) throw new Error("No chest found to deliver into.");
      }
      return;
    }
    case "explore": {
      if (stepIndex === 1) await wander();
      return;
    }
    case "build": {
      if (stepIndex === 0) bot.chat("Scouting a build site now.");
      if (stepIndex === 2) bot.chat("Placing blocks — needs materials in inventory.");
      return;
    }
    default: {
      return;
    }
  }
}

const PERSISTENT_INTENTS = new Set(["guard", "follow"]);

async function execute(order) {
  state.current = order;
  stopRoutines();
  const total = Math.max(order.plan?.length ?? 1, 1);
  log(`[worker] executing "${order.prompt}" → ${order.label}`);

  try {
    for (let index = 0; index < total; index += 1) {
      const step = order.plan[index] ?? { title: "Step", detail: "" };
      await report({
        status: "running",
        step: index + 1,
        progress: Math.round(((index + 1) / total) * 100),
        message: `${index + 1}/${total} ${step.title} — ${step.detail}`,
      });
      await performStep(order, index);
      await sleep(600);
    }
    await report({
      status: "done",
      step: total,
      progress: 100,
      message: `Finished: ${order.label}. ${order.reply ?? ""}`.trim(),
    });
    log("[worker] order complete");
    void reportState("online", `Order complete: ${order.label}`);
  } catch (error) {
    log("[worker] order failed:", error.message);
    if (!PERSISTENT_INTENTS.has(order.intent)) stopRoutines();
    await report({ status: "failed", message: error.message });
  } finally {
    // Guard and follow routines keep running after the order is marked done.
    state.current = null;
  }
}

let polling = false;

async function poll() {
  if (polling || state.current) return;
  if (!state.connected && state.pendingOrder) return;
  polling = true;
  try {
    const data = await api("/worker/claim");

    if (data.bot) {
      if (data.bot.paused) {
        if (state.bot) {
          log("[worker] runtime paused, leaving the server");
          state.config = { ...data.bot, autoReconnect: false };
          closeBot("Runtime paused");
        }
        return;
      }
      if (!state.bot) void connect(data.bot);
    }

    if (data.order && !state.current) {
      if (state.connected) await execute(data.order);
      else state.pendingOrder = data.order;
    }
  } catch (error) {
    log("[worker] poll failed:", error.message);
  } finally {
    polling = false;
  }
}

async function heartbeatLoop() {
  // The loadout is attached here, so the console inventory refreshes live.
  await reportState(
    state.connected ? "online" : state.reachError ? "error" : "connecting",
    state.reachError ?? undefined,
  );
}

log(`[worker] BotArena worker starting · ${BASE_URL}`);
await heartbeatLoop();
setInterval(heartbeatLoop, HEARTBEAT_MS);
setInterval(poll, POLL_MS);
void poll();

async function shutdown(signal) {
  log(`[worker] ${signal} received, shutting down`);
  state.shuttingDown = true;
  stopRoutines();
  try {
    await reportState("offline", "Worker stopped");
  } catch {
    /* ignore */
  }
  closeBot();
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
