import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { LogOut, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type Tone =
  | "ink"
  | "lime"
  | "orange"
  | "blue"
  | "pink"
  | "sand"
  | "paper";

export const toneBg: Record<Tone, string> = {
  lime: "bg-nb-lime",
  orange: "bg-nb-orange",
  blue: "bg-nb-blue",
  pink: "bg-nb-pink",
  sand: "bg-nb-sand",
  paper: "bg-nb-paper",
  ink: "bg-nb-ink",
};

export const toneBorder: Record<Tone, string> = {
  lime: "border-nb-lime",
  orange: "border-nb-orange",
  blue: "border-nb-blue",
  pink: "border-nb-pink",
  sand: "border-nb-sand",
  paper: "border-nb-paper",
  ink: "border-nb-ink",
};

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden border-[3px] border-nb-ink bg-[#16202f]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" role="presentation">
        {/* stone head block */}
        <rect x="52" y="8" width="4" height="44" fill="#6f757d" />
        <rect x="10" y="8" width="44" height="44" fill="#b6bac0" />
        <rect x="10" y="8" width="44" height="9" fill="#d4d8dd" />
        <rect x="10" y="47" width="44" height="5" fill="#9ba1a9" />
        <g fill="#8b9199">
          <rect x="30" y="11" width="4" height="4" />
          <rect x="45" y="19" width="4" height="4" />
          <rect x="13" y="41" width="4" height="4" />
        </g>
        {/* copper antenna */}
        <rect x="3" y="13" width="9" height="4" fill="#c8814f" />
        <rect x="9" y="11" width="3" height="9" fill="#8f959d" />
        {/* glowing eyes */}
        <rect x="15" y="20" width="14" height="14" fill="#20242b" />
        <rect x="17" y="22" width="10" height="10" fill="#e6332a" />
        <rect x="33" y="20" width="14" height="14" fill="#20242b" />
        <rect x="35" y="22" width="10" height="10" fill="#e6332a" />
        {/* mouth grill */}
        <rect x="20" y="36" width="24" height="11" fill="#181c23" />
        <g fill="#b4b9c0">
          <rect x="22" y="38" width="3" height="7" />
          <rect x="27" y="38" width="3" height="7" />
          <rect x="32" y="38" width="3" height="7" />
          <rect x="37" y="38" width="3" height="7" />
        </g>
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg tracking-tight">BotArena</span>
        <span className="nb-label mt-1 text-[9px] text-muted-foreground">
          Minecraft ops
        </span>
      </span>
    </span>
  );
}

export function Panel({
  label,
  tone = "sand",
  action,
  className,
  bodyClassName,
  children,
}: {
  label?: string;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("nb-panel flex min-w-0 flex-col", className)}>
      {(label || action) && (
        <header
          className={cn(
            "flex items-center justify-between gap-3 border-b-[3px] border-nb-ink px-4 py-2.5",
            toneBg[tone],
            tone === "ink" ? "text-nb-paper" : "text-nb-ink",
          )}
        >
          <span className="nb-label truncate">{label}</span>
          {action}
        </header>
      )}
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

const statusStyles = {
  online: { label: "Online", chip: "bg-nb-lime" },
  connecting: { label: "Connecting", chip: "bg-nb-blue" },
  paused: { label: "Paused", chip: "bg-nb-sand" },
  offline: { label: "Offline", chip: "bg-nb-surface" },
  error: { label: "Error", chip: "bg-nb-red" },
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
        "inline-flex items-center gap-1.5 border-2 border-nb-ink px-2 py-[3px] font-mono text-[10px] font-bold tracking-[0.14em] uppercase",
        style.chip,
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 bg-nb-ink",
          status === "online" && "animate-pulse",
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
        "inline-flex items-center border-2 border-nb-ink px-1.5 py-[2px] font-mono text-[9px] font-bold tracking-[0.16em] uppercase",
        mode === "live" ? "bg-nb-orange" : "bg-nb-surface",
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

const AVATAR_COLORS = [
  "bg-nb-lime",
  "bg-nb-orange",
  "bg-nb-blue",
  "bg-nb-pink",
  "bg-nb-sand",
];

const avatarSizes = {
  sm: "size-9 gap-[2px] p-[3px]",
  md: "size-12 gap-[2px] p-[3px]",
  lg: "size-16 gap-[3px] p-1",
};

export function PixelAvatar({
  seed,
  size = "md",
  className,
}: {
  seed: string;
  size?: keyof typeof avatarSizes;
  className?: string;
}) {
  let hash = 7;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 100003;

  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const cells: boolean[] = [];
  for (let i = 0; i < 8; i += 1) cells.push(((hash >> i) & 1) === 1);

  const grid = [
    [cells[0], cells[1], cells[1], cells[0]],
    [cells[2], cells[3], cells[3], cells[2]],
    [cells[4], cells[5], cells[5], cells[4]],
    [cells[6], cells[7], cells[7], cells[6]],
  ];

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 grid-cols-4 grid-rows-4 border-[3px] border-nb-ink bg-nb-surface shadow-[3px_3px_0_0_var(--color-nb-ink)]",
        avatarSizes[size],
        className,
      )}
    >
      {grid.flatMap((row, rowIndex) =>
        row.map((filled, colIndex) => (
          <span
            key={`${rowIndex}-${colIndex}`}
            className={filled ? color : "bg-transparent"}
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
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  sub: string;
  tone?: Tone;
}) {
  return (
    <div className="nb-panel-sm flex flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="nb-label text-muted-foreground">{label}</span>
        <span
          className={cn("size-2.5 border-2 border-nb-ink", toneBg[tone])}
        />
      </div>
      <span className="mt-2 font-display text-3xl leading-none">{value}</span>
      <span className="mt-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
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

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-nb-ink bg-nb-paper">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-4 px-5">
        <Link to="/" className="group flex items-center gap-3">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            to="/dashboard"
            className={cn(
              "border-2 px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.14em] uppercase",
              active === "Console"
                ? "border-nb-ink bg-nb-ink text-nb-paper"
                : "border-transparent hover:border-nb-ink hover:bg-nb-sand",
            )}
          >
            <Terminal className="mr-1.5 inline size-3.5" />
            Console
          </Link>
          <a
            href="/#how"
            className="border-2 border-transparent px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.14em] uppercase hover:border-nb-ink hover:bg-nb-sand"
          >
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden max-w-[180px] truncate font-mono text-[11px] text-muted-foreground md:inline">
            {user?.email ?? user?.name ?? "operator"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SectionHeading({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="nb-label text-muted-foreground">{kicker}</p>
        <h2 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
