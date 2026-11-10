import { useState } from "react";
import { ChevronDown, Package } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";
import { Panel, PixelAvatar } from "@/components/keepcraft-ui";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type LoadoutItem = { slot: number; item: string; count: number };
type Loadout = { heldSlot: number; items: LoadoutItem[] };

const ARMOR_SLOTS = [
  { slot: 100, label: "Helmet" },
  { slot: 101, label: "Chestplate" },
  { slot: 102, label: "Leggings" },
  { slot: 103, label: "Boots" },
] as const;

/** Block textures live in /block instead of /item. */
const BLOCK_ITEMS = new Set([
  "oak_log",
  "birch_log",
  "spruce_log",
  "oak_planks",
  "cobblestone",
  "stone",
  "dirt",
  "sand",
  "gravel",
  "crafting_table",
  "chest",
  "furnace",
  "obsidian",
  "torch",
]);

/** A few assets don't follow the item/block texture naming scheme. */
const TEXTURE_OVERRIDES: Record<string, string> = {
  shield: "entity/shield_base",
  crafting_table: "block/crafting_table_front",
};

const DEMO_ARMOR = [
  "netherite_helmet",
  "diamond_chestplate",
  "iron_leggings",
  "netherite_boots",
];

const DEMO_HOTBAR: Array<[string, number]> = [
  ["torch", 32],
  ["cooked_beef", 12],
  ["oak_log", 24],
  ["cobblestone", 64],
  ["water_bucket", 1],
  ["crafting_table", 1],
  ["golden_apple", 3],
  ["bow", 1],
];

const DEMO_BAG: Array<[string, number]> = [
  ["iron_ingot", 18],
  ["coal", 32],
  ["redstone", 24],
  ["arrow", 32],
  ["bread", 16],
  ["oak_planks", 48],
  ["stone", 64],
  ["diamond", 8],
  ["emerald", 3],
  ["map", 1],
  ["ender_pearl", 2],
  ["wheat", 24],
  ["string", 6],
  ["gunpowder", 12],
  ["book", 1],
  ["lapis_lazuli", 16],
  ["iron_pickaxe", 1],
  ["dirt", 64],
  ["apple", 5],
  ["bucket", 1],
  ["bone", 9],
  ["feather", 12],
  ["flint", 7],
  ["clay_ball", 10],
  ["slime_ball", 4],
];

function hashOf(value: string) {
  let hash = 7;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) % 100003;
  return hash;
}

/** Deterministic demo kit so simulated bots still show a believable loadout. */
function demoLoadout(name: string): Loadout {
  const hash = hashOf(name);
  const pickaxes = ["diamond_pickaxe", "netherite_pickaxe", "iron_pickaxe"];
  const items: LoadoutItem[] = [];

  DEMO_ARMOR.forEach((item, index) =>
    items.push({ slot: 100 + index, item, count: 1 }),
  );
  items.push({ slot: 36, item: pickaxes[hash % pickaxes.length], count: 1 });
  DEMO_HOTBAR.forEach(([item, count], index) =>
    items.push({ slot: 37 + index, item, count }),
  );
  items.push({ slot: 45, item: "shield", count: 1 });

  const bagSize = 19 + (hash % 7);
  DEMO_BAG.slice(0, bagSize).forEach(([item, count], index) =>
    items.push({ slot: 9 + index, item, count: count + (hash % 4) }),
  );

  return { heldSlot: 0, items };
}

function textureUrl(item: string, version: string) {
  const branch = /^1\.\d+(\.\d+)?$/.test(version) ? version : "1.21.4";
  const folder = BLOCK_ITEMS.has(item) ? "block" : "item";
  const path = TEXTURE_OVERRIDES[item] ?? `${folder}/${item}`;
  return `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/${branch}/assets/minecraft/textures/${path}.png`;
}

function humanize(item: string) {
  return item
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function SkinRender({ username, seed }: { username: string; seed: string }) {
  const [stage, setStage] = useState(0);
  const name = encodeURIComponent(username);
  const sources = [
    `https://minotar.net/armor/body/${name}/180.png`,
    `https://minotar.net/body/${name}/180.png`,
    `https://mc-heads.net/body/${name}/right`,
  ];

  if (stage >= sources.length) {
    return <PixelAvatar seed={seed} size="lg" className="my-4" />;
  }

  return (
    <img
      src={sources[stage]}
      alt={`${username} skin render`}
      loading="lazy"
      onError={() => setStage((current) => current + 1)}
      className="h-[150px] w-auto max-w-none [image-rendering:pixelated]"
    />
  );
}

function ItemSlot({
  item,
  count = 0,
  label,
  hint,
  version,
  selected = false,
  className,
}: {
  item?: string;
  count?: number;
  label: string;
  hint?: string;
  version: string;
  selected?: boolean;
  className?: string;
}) {
  const [failedItem, setFailedItem] = useState<string | null>(null);
  const failed = item !== undefined && failedItem === item;
  const stack = Math.max(1, count);

  return (
    <div
      tabIndex={0}
      role="img"
      aria-label={item ? `${humanize(item)} ×${stack}, ${label}` : `Empty ${label}`}
      className={cn(
        "group relative aspect-square min-w-0 border-2 border-nb-ink",
        item ? "bg-nb-surface" : "bg-nb-sand/60",
        selected && "bg-nb-lime shadow-[2px_2px_0_0_var(--color-nb-ink)]",
        className,
      )}
    >
      <span className="grid h-full w-full place-items-center p-[3px]">
        {item ? (
          failed ? (
            <span className="font-mono text-[9px] font-bold uppercase text-nb-ink/50">
              {item.slice(0, 2)}
            </span>
          ) : (
            <img
              src={textureUrl(item, version)}
              alt=""
              loading="lazy"
              onError={() => setFailedItem(item)}
              className="size-full object-contain [image-rendering:pixelated]"
            />
          )
        ) : (
          <span className="size-1.5 bg-nb-ink/20" />
        )}
      </span>

      {item && stack > 1 && (
        <span className="absolute -right-1 -bottom-1 min-w-4 border-2 border-nb-ink bg-nb-paper px-[2px] text-center font-mono text-[8px] leading-[11px] font-bold text-nb-ink">
          {stack}
        </span>
      )}

      {selected && (
        <span className="absolute inset-x-0 -bottom-[2px] h-[3px] bg-nb-ink" />
      )}

      <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-50 hidden -translate-x-1/2 flex-col border-2 border-nb-ink bg-nb-ink px-2 py-1 text-nb-paper shadow-[2px_2px_0_0_var(--color-nb-lime)] group-hover:flex group-focus:flex">
        <span className="whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.12em]">
          {item ? humanize(item) : "Empty"}
        </span>
        <span className="whitespace-nowrap font-mono text-[8px] text-nb-paper/70">
          {label}
          {item && stack > 1 ? ` · ×${stack}` : ""}
          {hint ? ` · ${hint}` : ""}
        </span>
      </span>
    </div>
  );
}

export function LoadoutInspector({ bot }: { bot: Doc<"bots"> }) {
  const [bagOpen, setBagOpen] = useState(false);

  const live = bot.mode === "live" && Boolean(bot.loadout);
  const loadout =
    live
      ? (bot.loadout as Loadout)
      : bot.mode === "simulated"
        ? demoLoadout(bot.name)
        : null;

  const items = loadout?.items ?? [];
  const heldSlot = loadout?.heldSlot ?? 0;
  const at = (slot: number) => items.find((entry) => entry.slot === slot);

  const mainHand = at(36 + heldSlot);
  const offHand = at(45);
  const hotbarStacks = items.filter((entry) => entry.slot >= 36 && entry.slot <= 44).length;
  const bagStacks = items.filter((entry) => entry.slot >= 9 && entry.slot <= 35).length;

  return (
    <Panel
      label="Inspector / loadout"
      tone="pink"
      bodyClassName="flex flex-col gap-3 p-3"
      action={
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-nb-ink/70">
          {live
            ? `live · ${timeAgo(bot.loadoutAt)}`
            : bot.mode === "simulated"
              ? "sim sample"
              : "no feed"}
        </span>
      }
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-2.5">
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Armor
          </span>
          <div className="grid gap-1">
            {ARMOR_SLOTS.map((slot) => {
              const entry = at(slot.slot);
              return (
                <ItemSlot
                  key={slot.slot}
                  item={entry?.item}
                  count={entry?.count}
                  label={slot.label}
                  hint="armor"
                  version={bot.version}
                  className="size-10"
                />
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1">
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Skin
          </span>
          <div className="relative overflow-hidden border-[3px] border-nb-ink bg-nb-sand shadow-[3px_3px_0_0_var(--color-nb-ink)]">
            <SkinRender key={bot.username} username={bot.username} seed={bot.name} />
            <span className="absolute inset-x-0 bottom-0 truncate border-t-2 border-nb-ink bg-nb-surface/95 px-1 py-[1px] text-center font-mono text-[8px] font-bold uppercase tracking-[0.1em]">
              {bot.username}
            </span>
          </div>
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
            {bot.mode === "live" ? "live account" : "sim avatar"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Hands
          </span>
          <div className="grid gap-1">
            <ItemSlot
              item={mainHand?.item}
              count={mainHand?.count}
              label="Main hand"
              hint={`slot ${heldSlot + 1}`}
              version={bot.version}
              className="size-10"
            />
            <ItemSlot
              item={offHand?.item}
              count={offHand?.count}
              label="Off hand"
              version={bot.version}
              className="size-10"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t-2 border-nb-ink/10 pt-2">
        <span className="nb-label text-muted-foreground">Hotbar</span>
        <span className="font-mono text-[9px] text-muted-foreground">
          {hotbarStacks}/9 slots
        </span>
      </div>

      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 9 }, (_, index) => {
          const slot = 36 + index;
          const entry = at(slot);
          return (
            <ItemSlot
              key={slot}
              item={entry?.item}
              count={entry?.count}
              label={`Hotbar ${index + 1}`}
              hint="hotbar"
              version={bot.version}
              selected={index === heldSlot}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setBagOpen((open) => !open)}
        aria-expanded={bagOpen}
        className="flex w-full items-center justify-between gap-2 border-2 border-nb-ink bg-nb-surface px-2 py-1.5 text-left hover:bg-nb-lime"
      >
        <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
          <Package className="size-3.5" /> Inventory · {bagStacks}/27
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            bagOpen && "rotate-180",
          )}
        />
      </button>

      {bagOpen && (
        <div className="grid grid-cols-9 gap-1 border-2 border-nb-ink bg-nb-paper p-1.5">
          {Array.from({ length: 27 }, (_, index) => {
            const slot = 9 + index;
            const entry = at(slot);
            return (
              <ItemSlot
                key={slot}
                item={entry?.item}
                count={entry?.count}
                label={`Bag ${index + 1}`}
                hint="inventory"
                version={bot.version}
              />
            );
          })}
        </div>
      )}

      {!loadout && (
        <p className="border-2 border-dashed border-nb-ink px-2 py-1.5 font-mono text-[9px] leading-4 text-muted-foreground">
          No inventory reported yet. Start the worker and the bot uploads its
          loadout with every heartbeat.
        </p>
      )}
    </Panel>
  );
}
