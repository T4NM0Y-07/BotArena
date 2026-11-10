import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bot,
  Loader2,
  Plus,
  RadioTower,
  Sparkles,
  Zap,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AppBar,
  ModeTag,
  Panel,
  PixelAvatar,
  SectionHeading,
  Stat,
  StatusPill,
} from "@/components/keepcraft-ui";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const quickOrders = [
  "mine 32 iron and stash it in the base chest",
  "follow me and keep the mobs off my back",
  "harvest the wheat and replant every tile",
  "guard the base while I'm offline",
];

const levelColor: Record<string, string> = {
  info: "bg-nb-blue",
  success: "bg-nb-lime",
  warn: "bg-nb-orange",
  error: "bg-nb-red",
  order: "bg-nb-pink",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="nb-label text-muted-foreground">{label}</span>
      {children}
      {hint && (
        <span className="font-mono text-[10px] text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

type AuthMode = "offline" | "microsoft";
type BotMode = "simulated" | "live";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const bots = useQuery(api.bots.list);
  const summary = useQuery(api.orders.summary);
  const events = useQuery(api.events.listRecent);
  const createBot = useMutation(api.bots.create);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    host: "",
    port: "25565",
    username: "",
    version: "1.21.4",
    authMode: "offline" as AuthMode,
    mode: "simulated" as BotMode,
    autoReconnect: true,
  });

  const online = bots?.filter((bot) => bot.status === "online").length ?? 0;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const botId = await createBot({
        name: form.name.trim() || form.username.trim(),
        host: form.host,
        port: Number(form.port) || 25565,
        username: form.username,
        version: form.version,
        authMode: form.authMode,
        mode: form.mode,
        autoReconnect: form.autoReconnect,
      });
      toast.success("Bot deployed. Console is ready.");
      setOpen(false);
      setForm((current) => ({ ...current, name: "", host: "", username: "" }));
      navigate(`/bot/${botId}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message.replace(/^.*Uncaught Error: /, "")
          : "Could not deploy the bot.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-nb-paper">
      <AppBar active="Console" />

      <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="nb-label text-muted-foreground">Command deck</p>
            <h1 className="mt-1 font-display text-3xl tracking-tight uppercase sm:text-4xl">
              {user?.name ? `${user.name.split(" ")[0]}'s bots, on shift.` : "Your bots, on shift."}
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Deploy a Minecraft account, type orders in plain English, and watch
              the runtime work through them step by step.
            </p>
          </div>
          <Button size="lg" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Deploy a bot
          </Button>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Bots online"
            value={`${online}/${bots?.length ?? 0}`}
            sub="live connections"
            tone="lime"
          />
          <Stat
            label="Active orders"
            value={summary?.active ?? 0}
            sub={`${summary?.last24h ?? 0} sent in 24h`}
            tone="blue"
          />
          <Stat
            label="Completed"
            value={summary?.completed ?? 0}
            sub={summary?.failed ? `${summary.failed} failed` : "all time"}
            tone="orange"
          />
          <Stat
            label="Runtime mode"
            value={
              bots && bots.some((bot) => bot.mode === "live") ? "Live" : "Sim"
            }
            sub="per-bot worker bridge"
            tone="pink"
          />
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
          <section className="min-w-0">
            <SectionHeading
              kicker="Fleet"
              title="Bots under command"
              action={
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {bots?.length ?? 0} deployed
                </span>
              }
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {bots === undefined && (
                <div className="nb-panel-sm flex items-center gap-2 p-4 font-mono text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading fleet…
                </div>
              )}

              {bots?.map((bot) => (
                <Link
                  key={bot._id}
                  to={`/bot/${bot._id}`}
                  className="nb-panel nb-panel-lift group flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2 border-b-[3px] border-nb-ink px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <StatusPill status={bot.status} />
                      <ModeTag mode={bot.mode} />
                    </div>
                    <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>

                  <div className="flex flex-1 items-center gap-3 px-4 py-4">
                    <PixelAvatar seed={bot.name} />
                    <div className="min-w-0">
                      <p className="truncate font-display text-base tracking-tight">
                        {bot.name}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {bot.username} @ {bot.host}:{bot.port}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/80">
                        {bot.statusMessage ?? "No status yet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t-2 border-nb-ink/15 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>{bot.openOrders} open</span>
                    <span>{bot.ordersCompleted} done</span>
                    <span>{timeAgo(bot.lastSeenAt)}</span>
                  </div>
                </Link>
              ))}

              {bots?.length === 0 && (
                <div className="nb-panel-flat border-dashed p-6 text-center sm:col-span-2">
                  <span className="mx-auto grid size-12 place-items-center border-[3px] border-nb-ink bg-nb-lime shadow-[3px_3px_0_0_var(--color-nb-ink)]">
                    <Bot className="size-6" />
                  </span>
                  <h3 className="mt-4 font-display text-lg tracking-tight">
                    No bots on the roster
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Start with simulation mode — it needs no server login and
                    shows you the full order flow in seconds.
                  </p>
                  <Button className="mt-5" onClick={() => setOpen(true)}>
                    <Plus className="size-4" />
                    Deploy a bot
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-start gap-3 border-2 border-nb-ink bg-nb-surface px-4 py-3">
              <RadioTower className="mt-0.5 size-4 shrink-0" />
              <p className="font-mono text-[10px] leading-5 text-muted-foreground">
                <span className="font-bold text-nb-ink">SIM</span> plans orders
                without a game connection.{" "}
                <span className="font-bold text-nb-ink">LIVE</span> needs the
                companion worker running on an always-on machine — the key is in
                each bot&apos;s console.
              </p>
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            <Panel
              label="Recent activity"
              tone="ink"
              bodyClassName="p-0"
              action={
                <span className="font-mono text-[10px] text-nb-paper/70">
                  {events?.length ?? 0} lines
                </span>
              }
            >
              <ul className="divide-y-2 divide-nb-ink/10">
                {events?.length === 0 && (
                  <li className="px-4 py-6 text-center font-mono text-[11px] text-muted-foreground">
                    Nothing logged yet. Send an order to wake the feed up.
                  </li>
                )}
                {events?.map((event) => (
                  <li key={event._id} className="flex gap-2.5 px-4 py-2.5">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 border border-nb-ink",
                        levelColor[event.level] ?? "bg-nb-sand",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {event.botName} · {timeAgo(event.createdAt)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5">
                        {event.message}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel label="Quick orders" tone="lime" bodyClassName="p-0">
              <ul className="divide-y-2 divide-nb-ink/10">
                {quickOrders.map((prompt) => (
                  <li key={prompt}>
                    {bots?.[0] ? (
                      <Link
                        to={`/bot/${bots[0]._id}`}
                        state={{ prompt }}
                        className="group flex items-center gap-2 px-4 py-3 hover:bg-nb-sand"
                      >
                        <Zap className="size-3.5 shrink-0" />
                        <span className="flex-1 text-xs leading-5">“{prompt}”</span>
                        <ArrowUpRight className="size-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 px-4 py-3 text-xs leading-5 text-muted-foreground">
                        <Zap className="size-3.5 shrink-0" />“{prompt}”
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="border-t-2 border-nb-ink/15 px-4 py-2.5">
                <p className="font-mono text-[10px] text-muted-foreground">
                  {bots?.[0]
                    ? `Sends to ${bots[0].name}`
                    : "Deploy a bot to run these"}
                </p>
              </div>
            </Panel>

            <div className="border-2 border-nb-ink bg-nb-lime p-4">
              <p className="nb-label flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Operator tip
              </p>
              <p className="mt-1.5 text-xs leading-5">
                Include a number and an item to get a precise plan: “mine{" "}
                <span className="font-mono font-bold">64</span>{" "}
                <span className="font-mono font-bold">cobblestone</span>”. Without
                it the bot defaults to 16.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <p className="nb-label text-muted-foreground">New deployment</p>
            <DialogTitle className="font-display text-2xl tracking-tight uppercase">
              Deploy a bot
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Simulation mode needs no server. Live mode needs a reachable Java
              server and the companion worker.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bot name" hint="Shown in the console">
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Pioneer"
                  maxLength={24}
                />
              </Field>
              <Field label="Minecraft username" hint="The account the bot logs in with">
                <Input
                  value={form.username}
                  onChange={(event) =>
                    setForm({ ...form, username: event.target.value })
                  }
                  placeholder="PioneerBot"
                  minLength={3}
                  maxLength={16}
                  required
                />
              </Field>
              <Field label="Server host" hint="No port, no protocol">
                <Input
                  value={form.host}
                  onChange={(event) =>
                    setForm({ ...form, host: event.target.value })
                  }
                  placeholder="play.ironvale.net"
                  required
                />
              </Field>
              <Field label="Port">
                <Input
                  value={form.port}
                  onChange={(event) =>
                    setForm({ ...form, port: event.target.value })
                  }
                  inputMode="numeric"
                  placeholder="25565"
                  required
                />
              </Field>
              <Field label="Server version">
                <Input
                  value={form.version}
                  onChange={(event) =>
                    setForm({ ...form, version: event.target.value })
                  }
                  placeholder="1.21.4"
                />
              </Field>
              <Field label="Login mode">
                <div className="flex gap-2">
                  {(
                    [
                      ["offline", "Offline"],
                      ["microsoft", "Microsoft"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, authMode: value })}
                      className={cn(
                        "h-11 flex-1 border-2 border-nb-ink font-mono text-[10px] font-bold uppercase tracking-[0.12em]",
                        form.authMode === value
                          ? "bg-nb-ink text-nb-paper"
                          : "bg-nb-surface hover:bg-nb-sand",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div>
              <p className="nb-label mb-1.5 text-muted-foreground">Runtime</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    [
                      "simulated",
                      "Simulation",
                      "Runs the plan in the cloud. No game login.",
                    ],
                    [
                      "live",
                      "Live server",
                      "Drives a real account through the worker.",
                    ],
                  ] as const
                ).map(([value, title, copy]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, mode: value })}
                    className={cn(
                      "border-2 border-nb-ink p-3 text-left",
                      form.mode === value
                        ? "bg-nb-lime shadow-[3px_3px_0_0_var(--color-nb-ink)]"
                        : "bg-nb-surface hover:bg-nb-sand",
                    )}
                  >
                    <span className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
                      {title}
                      <span
                        className={cn(
                          "size-2.5 border-2 border-nb-ink",
                          form.mode === value ? "bg-nb-ink" : "bg-nb-paper",
                        )}
                      />
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-nb-ink/70">
                      {copy}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-2 border-nb-ink bg-nb-surface px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold">Auto-reconnect</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Rejoin after kicks and restarts
                </p>
              </div>
              <Switch
                checked={form.autoReconnect}
                onCheckedChange={(checked) =>
                  setForm({ ...form, autoReconnect: checked })
                }
              />
            </div>

            {error && (
              <p className="border-2 border-nb-ink bg-nb-red px-3 py-2 font-mono text-[11px] text-nb-ink">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !form.host || !form.username}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Deploy bot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
