/**
 * Subscription catalogue. Shared by the pricing pages and the billing
 * functions so prices can never drift between the marketing copy and checkout.
 */

export type PlanId = "solo" | "squad" | "studio";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  summary: string;
  priceCents: number;
  interval: "month";
  botLimit: number;
  highlight: boolean;
  accent: "cyan" | "lime" | "violet";
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    tagline: "One world. One reliable teammate.",
    summary:
      "For a single survival world that needs a dependable presence while you are away.",
    priceCents: 900,
    interval: "month",
    botLimit: 1,
    highlight: false,
    accent: "cyan",
    features: [
      "1 always-on Minecraft bot",
      "Unlimited plain-English orders",
      "Live console and activity history",
      "Automatic reconnect after kicks or restarts",
      "7-day free trial",
    ],
  },
  {
    id: "squad",
    name: "Squad",
    tagline: "A small crew for a busy server.",
    summary:
      "For SMPs and friend groups that want a few bots watching different corners of the world.",
    priceCents: 1900,
    interval: "month",
    botLimit: 3,
    highlight: true,
    accent: "lime",
    features: [
      "3 always-on Minecraft bots",
      "Everything in Solo",
      "Priority restart queue",
      "One-click command center",
      "Real-time server verification",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Every world you manage, in one room.",
    summary:
      "For creators and communities running more than one server, with their own worker host.",
    priceCents: 3900,
    interval: "month",
    botLimit: 5,
    highlight: false,
    accent: "violet",
    features: [
      "5 always-on Minecraft bots",
      "Everything in Squad",
      "Worker bridge for your own host",
      "Priority support",
      "Early access to new command packs",
    ],
  },
];

export const TRIAL_BOT_LIMIT = 1;

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
