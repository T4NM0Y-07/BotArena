import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowUpRight, Check, LogOut, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Plan } from "@/convex/lib/plans";
import { formatPrice } from "@/convex/lib/plans";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type Accent = "lime" | "cyan" | "violet" | "pink" | "amber" | "neutral";

export const accentText: Record<Accent, string> = {
  lime: "text-mc-lime",
  cyan: "text-mc-cyan",
  violet: "text-mc-violet",
  pink: "text-mc-pink",
  amber: "text-mc-amber",
  neutral: "text-mc-dim",
};

export const accentBg: Record<Accent, string> = {
  lime: "bg-mc-lime",
  cyan: "bg-mc-cyan",
  violet: "bg-mc-violet",
  pink: "bg-mc-pink",
  amber: "bg-mc-amber",
  neutral: "bg-mc-dim",
};

export const accentSoftBg: Record<Accent, string> = {
  lime: "bg-mc-lime/10 border-mc-lime/30 text-mc-lime",
  cyan: "bg-mc-cyan/10 border-mc-cyan/30 text-mc-cyan",
  violet: "bg-mc-violet/10 border-mc-violet/30 text-mc-violet",
  pink: "bg-mc-pink/10 border-mc-pink/30 text-mc-pink",
  amber: "bg-mc-amber/10 border-mc-amber/30 text-mc-amber",
  neutral: "bg-white/5 border-mc-line text-mc-dim",
};

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 grid-cols-2 grid-rows-2 gap-[3px] rounded-[3px] border border-mc-lime/40 bg-[#0a141b] p-[4px] shadow-[0_0_22px_-8px_rgba(184,255,60,0.7)]",
        className,
      )}
      aria-hidden
    >
      <span className="rounded-[1px] bg-mc-lime" />
      <span className="rounded-[1px] bg-mc-cyan/70" />
      <span className="rounded-[1px] bg-mc-violet/70" />
      <span className="rounded-[1px] bg-mc-lime/70" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-bold tracking-[0.04em] uppercase">
          MC Bot <span className="text-mc-lime">24/7</span>
        </span>
        <span className="mt-1 font-mono text-[8px] tracking-[0.22em] text-mc-dim uppercase">
          Server operations
        </span>
      </span>
    </span>
  );
}

export function Panel({
  label,
  accent = "neutral",
  action,
  className,
  bodyClassName,
  children,
}: {
  label?: string;
  accent?: Accent;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("mc-panel flex min-w-0 flex-col", className)}>
      {(label || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-mc-line px-4 py-2.5">
          <span className="mc-label flex min-w-0 items-center gap-2 text-mc-dim">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                accentBg[accent],
                accent !== "neutral" && "shadow-[0_0_8px_currentColor]",
              )}
            />
            <span className="truncate">{label}</span>
          </span>
          {action}
        </header>
      )}
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

const statusStyles = {
  online: {
    label: "Online",
    chip: "border-mc-lime/40 bg-mc-lime/10 text-mc-lime",
    dot: "bg-mc-lime shadow-[0_0_8px_rgba(184,255,60,0.9)]",
  },
  connecting: {
    label: "Syncing",
    chip: "border-mc-cyan/40 bg-mc-cyan/10 text-mc-cyan",
    dot: "bg-mc-cyan shadow-[0_0_8px_rgba(61,225,255,0.9)]",
  },
  paused: {
    label: "Paused",
    chip: "border-mc-amber/40 bg-mc-amber/10 text-mc-amber",
    dot: "bg-mc-amber",
  },
  offline: {
    label: "Offline",
    chip: "border-mc-line bg-white/[0.02] text-mc-dim",
    dot: "bg-mc-dim",
  },
  error: {
    label: "Error",
    chip: "border-[#ff5470]/40 bg-[#ff5470]/10 text-[#ff93a5]",
    dot: "bg-[#ff5470]",
  },
} as const;

export function StatusPill({
  status,
  className,
}: {
  status: keyof typeof statusStyles;
  className?: string;
}) {
  const style = statusStyles[status] ?? statusStyles.offline;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-[3px] font-mono text-[10px] font-medium tracking-[0.14em] uppercase",
        style.chip,
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          style.dot,
          (status === "online" || status === "connecting") && "animate-pulse",
        )}
      />
      {style.label}
    </span>
  );
}

export function ModeTag({
  mode,
  className,
}: {
  mode: "simulated" | "live";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-1.5 py-[2px] font-mono text-[9px] font-medium tracking-[0.16em] uppercase",
        mode === "live"
          ? "border-mc-lime/40 bg-mc-lime/5 text-mc-lime"
          : "border-mc-violet/40 bg-mc-violet/10 text-mc-violet",
        className,
      )}
      title={
        mode === "live"
          ? "Live mode — a worker drives a real Minecraft account"
          : "Simulation mode — plans run without a game connection"
      }
    >
      {mode === "live" ? "Live" : "Sim"}
    </span>
  );
}

const AVATAR_COLORS = ["bg-mc-lime", "bg-mc-cyan", "bg-mc-violet", "bg-mc-pink", "bg-mc-amber"];

const avatarSizes = {
  sm: "size-9 gap-[2px] p-[3px]",
  md: "size-12 gap-[2px] p-[3px]",
  lg: "size-16 gap-[2px] p-1",
};

export function BotAvatar({
  seed,
  size = "md",
  className,
}: {
  seed: string;
  size?: keyof typeof avatarSizes;
  className?: string;
}) {
  let hash = 11;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) % 100003;

  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const cells = Array.from({ length: 15 }, (_, index) => ((hash >> (index % 16)) & 1) === 1);
  const rows = [
    [cells[0], cells[1], cells[2], cells[1], cells[0]],
    [cells[3], cells[4], cells[5], cells[4], cells[3]],
    [cells[6], cells[7], cells[8], cells[7], cells[6]],
    [cells[9], cells[10], cells[11], cells[10], cells[9]],
    [cells[12], cells[13], cells[14], cells[13], cells[12]],
  ];

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 grid-cols-5 grid-rows-5 rounded-[3px] border border-mc-line-strong bg-[#091018] shadow-[0_0_20px_-10px_rgba(61,225,255,0.6)]",
        avatarSizes[size],
        className,
      )}
    >
      {rows.flatMap((row, rowIndex) =>
        row.map((filled, colIndex) => (
          <span
            key={`${rowIndex}-${colIndex}`}
            className={cn("rounded-[1px]", filled ? color : "bg-transparent")}
          />
        )),
      )}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent = "lime",
}: {
  label: string;
  value: ReactNode;
  sub: string;
  accent?: Accent;
}) {
  return (
    <div className="mc-panel relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-6 -bottom-8 size-20 rounded-full bg-white/[0.02] blur-2xl" />
      <div className="flex items-center justify-between gap-2">
        <span className="mc-label text-mc-dim">{label}</span>
        <span className={cn("size-1.5 rounded-full", accentBg[accent])} />
      </div>
      <span className="mt-2 block font-display text-3xl leading-none font-bold">
        {value}
      </span>
      <span className="mt-2 block font-mono text-[10px] tracking-wide text-mc-dim">
        {sub}
      </span>
    </div>
  );
}

export function AppBar({ active = "Console" }: { active?: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const tabs = [
    { label: "Control room", href: "/dashboard", icon: Terminal },
    { label: "Setup", href: "/setup" },
    { label: "Plans", href: "/#pricing" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-mc-line bg-mc-base/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-5">
        <Link to="/" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {tabs.map((tab) => {
            const isActive = active === tab.label;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-[3px] border px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.14em] uppercase transition-colors",
                  isActive
                    ? "border-mc-lime/40 bg-mc-lime/10 text-mc-lime"
                    : "border-transparent text-mc-dim hover:border-mc-line hover:bg-mc-raise hover:text-mc-text",
                )}
              >
                {tab.icon && <tab.icon className="size-3.5" />}
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden max-w-[180px] truncate font-mono text-[10px] text-mc-dim lg:inline">
            {user?.email ?? user?.name ?? "operator"}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteNav() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-mc-line bg-mc-base/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-5">
        <Link to="/">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: "How it works", href: "/#how" },
            { label: "Commands", href: "/#commands" },
            { label: "Pricing", href: "/#pricing" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-[3px] border border-transparent px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.14em] text-mc-dim uppercase transition-colors hover:border-mc-line hover:bg-mc-raise hover:text-mc-text"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!isAuthenticated && (
            <Link
              to="/auth"
              className="hidden px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-mc-dim uppercase hover:text-mc-text sm:block"
            >
              Sign in
            </Link>
          )}
          <Button asChild size="sm">
            <Link to={isAuthenticated ? "/dashboard" : "/setup"}>
              {isAuthenticated ? "Control room" : "Start free trial"}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SectionHeading({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="mc-label text-mc-lime">{kicker}</p>
        <h2 className="mt-2 font-display text-3xl leading-[1.05] font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm leading-6 text-mc-dim">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

const planAccentBorder: Record<Plan["accent"], string> = {
  lime: "border-mc-lime/50",
  cyan: "border-mc-cyan/40",
  violet: "border-mc-violet/40",
};

const planAccentText: Record<Plan["accent"], string> = {
  lime: "text-mc-lime",
  cyan: "text-mc-cyan",
  violet: "text-mc-violet",
};

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        "mc-panel mc-interactive relative flex flex-col p-5",
        plan.highlight && planAccentBorder[plan.accent],
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-5 rounded-[2px] border border-mc-lime/50 bg-mc-lime px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.16em] text-[#06110a] uppercase">
          Most popular
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold tracking-tight">
            {plan.name}
          </h3>
          <p className="mt-1 text-xs leading-5 text-mc-dim">{plan.tagline}</p>
        </div>
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            plan.accent === "lime"
              ? "bg-mc-lime"
              : plan.accent === "cyan"
                ? "bg-mc-cyan"
                : "bg-mc-violet",
          )}
        />
      </div>

      <div className="mt-5 flex items-end gap-1.5">
        <span className="font-display text-4xl leading-none font-bold">
          {formatPrice(plan.priceCents)}
        </span>
        <span className="pb-1 font-mono text-[10px] tracking-wide text-mc-dim uppercase">
          / month
        </span>
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-mc-line pt-5">
        {plan.features.slice(0, 4).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs leading-5">
            <Check className={cn("mt-0.5 size-3.5 shrink-0", planAccentText[plan.accent])} />
            <span className="text-mc-text/85">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        className="mt-6 w-full"
        variant={plan.highlight ? "default" : "outline"}
      >
        <Link to={`/plans/${plan.id}`}>View {plan.name}</Link>
      </Button>
    </div>
  );
}
