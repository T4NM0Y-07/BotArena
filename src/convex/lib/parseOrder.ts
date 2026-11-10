/**
 * Deterministic natural-language order parser.
 *
 * Operators type things like "mine 32 iron and stash it at base" and this
 * module turns the sentence into a labelled, ordered plan the runtime can
 * execute (and the console can preview before sending).
 */

export type PlanStep = { title: string; detail: string };

export type ParsedOrder = {
  intent: string;
  label: string;
  plan: PlanStep[];
  reply: string;
  params: { quantity?: number; target?: string; text?: string };
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  sixteen: 16,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  stack: 64,
  stacks: 64,
  half: 32,
  couple: 2,
  few: 3,
  dozen: 12,
};

const ITEM_ALIASES: Array<[RegExp, string]> = [
  [/\b(logs?|wood|timber)\b/, "oak logs"],
  [/\btrees?\b/, "oak logs"],
  [/\biron( ore)?\b/, "iron ore"],
  [/\b(gold|gold ore)\b/, "gold ore"],
  [/\bdiamonds?( ore)?\b/, "diamond ore"],
  [/\bcoal( ore)?\b/, "coal ore"],
  [/\bcopper( ore)?\b/, "copper ore"],
  [/\bemeralds?( ore)?\b/, "emerald ore"],
  [/\b(redstone|redstone ore)\b/, "redstone ore"],
  [/\blapis( lazuli)?\b/, "lapis ore"],
  [/\bancient debris|netherite\b/, "ancient debris"],
  [/\b(cobble)?stone\b/, "cobblestone"],
  [/\bdirt\b/, "dirt"],
  [/\bsand\b/, "sand"],
  [/\bgravel\b/, "gravel"],
  [/\bobsidian\b/, "obsidian"],
  [/\bwheat\b/, "wheat"],
  [/\bcarrots?\b/, "carrots"],
  [/\bpotato(es)?\b/, "potatoes"],
  [/\bbeetroots?\b/, "beetroot"],
  [/\bwool\b/, "wool"],
  [/\bsugarcane\b/, "sugar cane"],
  [/\bmelon(s)?\b/, "melon"],
  [/\bpumpkin(s)?\b/, "pumpkin"],
  [/\bapple(s)?\b/, "apples"],
  [/\bcows?|beef\b/, "beef"],
  [/\bpigs?|pork\b/, "porkchop"],
  [/\bchickens?|eggs?\b/, "chicken"],
  [/\bfish(ing)?\b/, "fish"],
];

const BUILD_TARGETS: Array<[RegExp, string]> = [
  [/\bshelter|hovel|hut\b/, "a 5×5 dirt shelter"],
  [/\bhouse|base|home\b/, "a small timber house"],
  [/\bbridge\b/, "a plank bridge"],
  [/\bwall\b/, "a perimeter wall"],
  [/\btower\b/, "a watchtower"],
  [/\bfarm\b/, "a crop farm plot"],
  [/\bpath|road\b/, "a gravel path"],
];

function extractQuantity(text: string): number | undefined {
  const digits = text.match(/(\d{1,3})\s*(?:x\s*)?/);
  if (digits) return clampQty(Number(digits[1]));

  for (const word of text.split(/[^a-z]+/)) {
    if (NUMBER_WORDS[word] !== undefined) return clampQty(NUMBER_WORDS[word]);
  }
  return undefined;
}

function clampQty(qty: number) {
  if (!Number.isFinite(qty) || qty <= 0) return 1;
  return Math.min(Math.floor(qty), 512);
}

function extractItem(text: string): string | undefined {
  const species = text.match(
    /\b(oak|birch|spruce|jungle|acacia|dark oak|mangrove|cherry)\b/,
  );
  if (species && /\b(logs?|wood|timber|trees?)\b/.test(text)) {
    return `${species[1]} logs`;
  }

  for (const [pattern, item] of ITEM_ALIASES) {
    if (pattern.test(text)) return item;
  }
  return undefined;
}

function extractPlayer(text: string): string | undefined {
  const match = text.match(/\b(?:player|user|for)\s+([a-z0-9_]{3,16})\b/);
  if (match) return match[1];
  const follow = text.match(/\bfollow\s+([a-z0-9_]{3,16})\b/);
  if (follow && follow[1] !== "me") return follow[1];
  return undefined;
}

function extractSpeech(text: string): string | undefined {
  const quoted = text.match(/["“']([^"”']{2,120})["”']/);
  if (quoted) return quoted[1].trim();
  const said = text.match(/\b(?:say|tell everyone|announce|shout|type)\b[:\s]+(.{2,120})$/);
  return said ? said[1].trim() : undefined;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Parses one free-text order into an executable plan. */
export function parseOrder(input: string): ParsedOrder {
  const text = input.toLowerCase().replace(/\s+/g, " ").trim();
  const quantity = extractQuantity(text) ?? 16;
  const item = extractItem(text);
  const speech = extractSpeech(input.trim());

  if (/\b(stop|halt|freeze|abort|cancel|stand down|shut up)\b/.test(text)) {
    return {
      intent: "stop",
      label: "Stand down",
      plan: [
        { title: "Finish current swing", detail: "Complete the action in progress, then clear the task queue." },
        { title: "Return to idle", detail: "Walk to the nearest safe hold position and stop pathing." },
        { title: "Report", detail: 'Chat "Standing by." and mark the order complete.' },
      ],
      reply: "Standing by.",
      params: {},
    };
  }

  if (/\b(sleep|go to bed|bed|rest|nap|wait until morning)\b/.test(text)) {
    return {
      intent: "sleep",
      label: "Sleep / hold",
      plan: [
        { title: "Find a bed", detail: "Path to the nearest owned bed or safe shelter." },
        { title: "Hold position", detail: "Sleep if it is night, otherwise stand guard until morning." },
        { title: "Confirm", detail: "Report the in-game time and health back to the console." },
      ],
      reply: "Heading to bed.",
      params: {},
    };
  }

  if (/\b(follow|stick with|stay with|come with)\b/.test(text)) {
    const player = extractPlayer(text) ?? "you";
    return {
      intent: "follow",
      label: `Follow ${player === "you" ? "operator" : player}`,
      plan: [
        { title: "Lock target", detail: `Acquire ${player === "you" ? "the operator" : player} and keep within 3 blocks.` },
        { title: "Trail", detail: "Match pace, jump obstacles, and re-path around water or lava." },
        { title: "Guard the gap", detail: "Attack hostile mobs that come within 4 blocks of the target." },
      ],
      reply: `Following ${player === "you" ? "you" : player}.`,
      params: { target: player },
    };
  }

  if (/\b(guard|protect|defend|patrol|watch|secure|kill|fight|hunt)\b/.test(text)) {
    const target = /\bzombies?|hostile|monsters?|mobs?\b/.test(text) ? "hostiles" : "the perimeter";
    return {
      intent: "guard",
      label: "Guard duty",
      plan: [
        { title: "Take position", detail: `Pick a vantage point covering ${target} and equip the best available weapon.` },
        { title: "Patrol loop", detail: "Cycle patrol points every 30 seconds, scanning for threats." },
        { title: "Engage", detail: "Fight anything hostile inside 12 blocks, then return to the loop." },
        { title: "Log", detail: "Report every engagement to the activity feed." },
      ],
      reply: "On guard duty.",
      params: { target },
    };
  }

  if (/\b(farm|harvest|plant|replant|crops?|tend)\b/.test(text)) {
    const crop = item ?? "wheat";
    const cropCount = quantity === 16 ? 64 : quantity;
    return {
      intent: "farm",
      label: `Harvest ${crop}`,
      plan: [
        { title: "Reach the field", detail: `Path to the nearest ${crop} plot within 96 blocks.` },
        { title: "Harvest", detail: `Collect up to ${cropCount} × ${crop}, leaving immature crops alone.` },
        { title: "Replant", detail: "Replant every harvested tile so the field stays productive." },
        { title: "Deposit", detail: `Store the harvest in the base chest and report the yield.` },
      ],
      reply: `Farming ${crop}.`,
      params: { quantity: cropCount, target: crop },
    };
  }

  if (/\b(fish|fishing)\b/.test(text)) {
    return {
      intent: "fish",
      label: "Fishing run",
      plan: [
        { title: "Pick a spot", detail: "Find fishable water within 64 blocks and equip a rod." },
        { title: "Cast", detail: `Fish until ${quantity === 16 ? 10 : quantity} catches or the rod breaks.` },
        { title: "Store", detail: "Deposit the catch into the base chest and report the count." },
      ],
      reply: "Going fishing.",
      params: { quantity: quantity === 16 ? 10 : quantity },
    };
  }

  if (/\b(build|construct|place|erect|make (a|an))\b/.test(text)) {
    const built = BUILD_TARGETS.find(([pattern]) => pattern.test(text))?.[1] ?? "a small outpost";
    return {
      intent: "build",
      label: `Build ${built}`,
      plan: [
        { title: "Survey", detail: `Scan the build site for ${built} and mark a footprint.` },
        { title: "Gather stock", detail: `Collect enough blocks for the build (target ${quantity === 16 ? 128 : quantity}).` },
        { title: "Construct", detail: `Place blocks for ${built}, working bottom-up, then light it.` },
        { title: "Handover", detail: "Walk the structure once, then report coordinates to the console." },
      ],
      reply: "Starting the build.",
      params: { quantity: quantity === 16 ? 128 : quantity, target: built },
    };
  }

  if (/\b(explore|scout|map|search for|look for|find)\b/.test(text)) {
    const found = item ?? "points of interest";
    return {
      intent: "explore",
      label: `Scout for ${found}`,
      plan: [
        { title: "Pick a heading", detail: "Choose an unexplored direction and top up food and torches." },
        { title: "Sweep", detail: `Walk a widening spiral looking for ${found}, dropping torches as it goes.` },
        { title: "Log findings", detail: "Record coordinates of anything notable and report back." },
        { title: "Return", detail: "Head home before food drops below 40%." },
      ],
      reply: `Scouting for ${found}.`,
      params: { target: found },
    };
  }

  const miningVerb =
    /\b(mine|dig|chop|gather|collect|get|fetch|stock|quarry|excavate)\b/.test(text);
  if (
    /\b(bring|deliver|drop|deposit|store|stash|give)\b/.test(text) &&
    !miningVerb
  ) {
    const cargo = item ?? "the load";
    return {
      intent: "deliver",
      label: `Deliver ${cargo}`,
      plan: [
        { title: "Pick up cargo", detail: `Take ${cargo} from the base chest into free inventory slots.` },
        { title: "Walk it over", detail: "Path to the operator or drop point without crossing lava." },
        { title: "Hand off", detail: `Drop ${cargo} at the delivery point and wait for pickup confirmation.` },
      ],
      reply: `Delivering ${cargo}.`,
      params: { target: cargo, quantity },
    };
  }

  if (/\b(say|tell|announce|shout|type|chat)\b/.test(text)) {
    const message = speech ?? "Hello from the console.";
    return {
      intent: "chat",
      label: "Send chat message",
      plan: [
        { title: "Compose", detail: `Prepare the chat line: “${message.slice(0, 120)}”` },
        { title: "Transmit", detail: "Send it once in public chat from the bot account." },
      ],
      reply: message,
      params: { text: message },
    };
  }

  if (/\b(mine|dig|excavate|quarry|chop|harvest wood|collect|gather|get|fetch|stock)\b/.test(text)) {
    const target = item ?? "cobblestone";
    return {
      intent: "gather",
      label: `Gather ${quantity} × ${target}`,
      plan: [
        { title: "Find resources", detail: `Scan within 64 blocks for ${target}.` },
        { title: "Gather", detail: `Collect ${quantity} × ${target}, prioritizing exposed veins and safe terrain.` },
        { title: "Secure haul", detail: "Deposit overflow into the nearest owned chest, keeping tools on hand." },
        { title: "Report", detail: `Chat “Got ${quantity} ${target}.” and log the final count.` },
      ],
      reply: `On it — gathering ${quantity} ${target}.`,
      params: { quantity, target },
    };
  }

  return {
    intent: "task",
    label: "General task",
    plan: [
      { title: "Interpret", detail: `Break the order down into reachable steps: “${input.trim().slice(0, 120)}”` },
      { title: "Prepare", detail: "Check inventory, health, and food before starting." },
      { title: "Execute", detail: "Work through the steps, pausing if health drops below 50%." },
      { title: "Report", detail: "Return a plain-language summary to the console when finished." },
    ],
    reply: titleCase("Working on it."),
    params: {},
  };
}
