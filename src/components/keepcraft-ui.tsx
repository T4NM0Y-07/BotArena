import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "lime" | "orange" | "blue" | "pink" | "sand" | "ink";

export const toneBg: Record<Tone, string> = {
  lime: "bg-nb-lime",
  orange: "bg-nb-orange",
  blue: "bg-nb-blue",
  pink: "bg-nb-pink",
  sand: "bg-nb-sand",
  ink: "bg-nb-ink",
};

export const toneBorder: Record<Tone, string> = {
  lime: "border-nb-lime",
  orange: "border-nb-orange",
  blue: "border-nb-blue",
  pink: "border-nb-pink",
  sand: "border-nb-sand",
  ink: "border-nb-ink",
};

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 grid-cols-2 grid-rows-2 gap-[2px] border-[3px] border-nb-ink bg-nb-ink p-[3px]",
        className,
      )}
    >
      <span className="bg-nb-lime" />
      <span className="bg-nb-surface" />
      <span className="bg-nb-surface" />
      <span className="bg-nb-lime" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg tracking-tight">KeepCrafting</span>
        <span className="nb-label mt-1 text-[9px] text-muted-foreground">
          Minecraft ops
        </span>
      </span>
    </span>
  );
}

export function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-l-[3px] border-nb-ink pl-3 text-prevail", className)}>{children}</div>;
}

export function Stat({ children, tone = "ink", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <div className={cn("border-[3px] border-nb-ink bg-nb-paper px-3 py-2 text-prevail", className)}>
      {children}
    </div>
  );
}

export function StatusPill({ children, tone = "ink", className }: { children?: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 border-[3px] bg-nb-paper px-2 py-0.5 text-prevail", className)}>
      <span className={cn("shrink-0 size-1.5 border-[1.5px] border-current", toneBg[tone])} />
      {children}
    </span>
  );
}

export function ModeTag({ tag }: { tag: "live" | "sim" }) {
  return tag === "live" ? <StatusPill tone="lime">live</StatusPill> : <StatusPill tone="sand">sim</StatusPill>;
}

