import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Pause,
  Play,
  Send,
  Server,
  Terminal,
  Trash2,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseOrder } from "@/convex/lib/parseOrder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LoadoutInspector } from "@/components/loadout-inspector";
import {
  AppBar,
  ModeTag,
  Panel,
  PixelAvatar,
  StatusPill,
} from "@/components/keepcraft-ui";
import { clock, convexSiteUrl, timeAgo, uptimeSince } from "@/lib/format";
import { cn } from "@/lib/utils";

const promptChips = [
  "mine 32 iron",
  "guard the base",
  "follow me",
  "harvest wheat and replant",
  "build a shelter before night",
  'say "hello in chat"',
];

const orderStatusStyle = {
  queued: { label: "Queued", chip: "bg-nb-sand" },
  running: { label: "Running", chip: "bg-nb-blue" },
  done: { label: "Done", chip: "bg-nb-lime" },
  failed: { label: "Failed", chip: "bg-nb-red" },
  cancelled: { label: "Cancelled", chip: "bg-nb-surface" },
} as const;

const levelColor: Record<string, string> = {
  info: "bg-nb-blue",
  success: "bg-nb-lime",
  warn: "bg-nb-orange",
  error: "bg-nb-red",
  order: "bg-nb-pink",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-nb-ink/10 py-2 last:border-0">
      <span className="nb-label shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-[11px]">
        {children}
      </span>
    </div>
  );
}

export default function BotDetail() {
  const { botId } = useParams<{ botId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const id = botId as Id<"bots">;

  const bot = useQuery(api.bots.get, botId ? { botId: id } : "skip");
  const orders = useQuery(api.orders.listByBot, botId ? { botId: id } : "skip");
  const events = useQuery(api.events.listByBot, botId ? { botId: id } : "skip");

  const createOrder = useMutation(api.orders.create);
  const cancelOrder = useMutation(api.orders.cancel);
  const togglePause = useMutation(api.bots.togglePause);
  const toggleAutoReconnect = useMutation(api.bots.toggleAutoReconnect);
  const setMode = useMutation(api.bots.setMode);
  const rotateWorkerKey = useMutation(api.bots.rotateWorkerKey);
  const removeBot = useMutation(api.bots.remove);

  const initialPrompt =
    (location.state as { prompt?: string } | null)?.prompt ?? "";
  const [prompt, setPrompt] = useState(initialPrompt);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const preview = useMemo(
    () => (prompt.trim().length > 2 ? parseOrder(prompt) : null),
    [prompt],
  );

  const siteUrl = convexSiteUrl();

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!preview || !botId || sending) return;
    setSending(true);
    setError(null);
    try {
      await createOrder({ botId: id, prompt });
      toast.success(`Order transmitted → ${preview.label}`);
      setPrompt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the order.");
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard is blocked in this browser.");
    }
  };

  const handleDelete = async () => {
    if (!botId) return;
    setDeleting(true);
    try {
      await removeBot({ botId: id });
      toast.success("Bot removed.");
      navigate("/dashboard");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not remove bot.");
      setDeleting(false);
    }
  };

  if (bot === null) {
    return (
      <div className="min-h-screen bg-nb-paper">
        <AppBar active="Console" />
        <main className="mx-auto max-w-lg px-5 py-20">
          <div className="nb-panel p-8 text-center">
            <h1 className="font-display text-2xl tracking-tight uppercase">
              Bot not found
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              It may have been removed, or it belongs to another workspace.
            </p>
            <Button asChild className="mt-5">
              <Link to="/dashboard">
                <ArrowLeft className="size-4" /> Back to console
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (bot === undefined) {
    return (
      <div className="min-h-screen bg-nb-paper">
        <AppBar active="Console" />
        <main className="flex min-h-[60vh] items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading bot…
        </main>
      </div>
    );
  }

  const paused = bot.status === "paused";
  const openOrders =
    orders?.filter((order) => order.status === "running" || order.status === "queued")
      .length ?? 0;

  const startCommand = [
    "cd worker && npm install",
    `KeepCrafting_URL=${siteUrl} KeepCrafting_KEY=${bot.workerKey} node keepcraft-worker.mjs`,
  ].join("\n");

  return (
    <div className="min-h-screen bg-nb-paper">
      <AppBar active="Console" />

      <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:py-9">
        <Link
          to="/dashboard"
          className="nb-label inline-flex items-center gap-1.5 text-muted-foreground hover:text-nb-ink hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Command deck
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PixelAvatar seed={bot.name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl tracking-tight uppercase">
                  {bot.name}
                </h1>
                <StatusPill status={bot.status} />
                <ModeTag mode={bot.mode} />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                {bot.username} · {bot.host}:{bot.port} · {bot.version} ·{" "}
                {bot.authMode === "microsoft" ? "Microsoft login" : "offline login"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => togglePause({ botId: id })}
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              {paused ? "Resume runtime" : "Pause runtime"}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Remove</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.62fr_1fr]">
          <div className="flex min-w-0 flex-col gap-5">
            <Panel
              label="Send an order"
              tone="lime"
              bodyClassName="p-4"
              action={
                <span className="font-mono text-[10px] text-nb-ink/60">
                  plain English
                </span>
              }
            >
              <form onSubmit={handleSend} className="flex flex-col gap-3">
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder='e.g. "mine 32 iron and stash it in the base chest"'
                  maxLength={280}
                  className="min-h-24 resize-none"
                  disabled={paused}
                />

                <div className="flex flex-wrap gap-1.5">
                  {promptChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPrompt(chip)}
                      disabled={paused}
                      className="border-2 border-nb-ink bg-nb-surface px-2 py-1 font-mono text-[10px] font-medium hover:bg-nb-lime disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {preview && (
                  <div className="border-2 border-nb-ink">
                    <div className="flex items-center justify-between gap-2 border-b-2 border-nb-ink bg-nb-sand px-2.5 py-1.5">
                      <span className="nb-label truncate">
                        Parsed · {preview.label}
                      </span>
                      <span className="nb-label shrink-0 text-muted-foreground">
                        {preview.plan.length} steps
                      </span>
                    </div>
                    <ol className="divide-y-2 divide-nb-ink/10">
                      {preview.plan.map((step, index) => (
                        <li
                          key={`${step.title}-${index}`}
                          className="flex items-start gap-2.5 px-2.5 py-2"
                        >
                          <span className="mt-0.5 grid size-4 shrink-0 place-items-center border-2 border-nb-ink bg-nb-surface font-mono text-[9px] font-bold">
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold leading-4">
                              {step.title}
                            </span>
                            <span className="block font-mono text-[10px] leading-4 text-muted-foreground">
                              {step.detail}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="border-t-2 border-nb-ink bg-nb-surface px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
                      Bot replies: “{preview.reply}”
                    </p>
                  </div>
                )}

                {error && (
                  <p className="border-2 border-nb-ink bg-nb-red px-3 py-2 font-mono text-[11px]">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Enter sends · Shift+Enter for a new line
                  </span>
                  <Button type="submit" disabled={!preview || sending || paused}>
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Transmit order
                  </Button>
                </div>

                {paused && (
                  <p className="border-2 border-nb-ink bg-nb-sand px-3 py-2 font-mono text-[10px]">
                    Runtime paused. Resume it to send new orders.
                  </p>
                )}
              </form>
            </Panel>

            <Panel
              label="Order log"
              tone="sand"
              bodyClassName="p-3"
              action={
                <span className="font-mono text-[10px] text-muted-foreground">
                  {orders?.length ?? 0} total · {openOrders} open
                </span>
              }
            >
              <div className="flex flex-col gap-3">
                {orders?.length === 0 && (
                  <div className="border-2 border-dashed border-nb-ink p-6 text-center">
                    <p className="font-display text-base tracking-tight uppercase">
                      Queue is empty
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Send the first order above. The plan appears here and the
                      log streams each step.
                    </p>
                  </div>
                )}

                {orders?.map((order) => {
                  const style =
                    orderStatusStyle[order.status] ?? orderStatusStyle.queued;
                  const cancellable =
                    order.status === "queued" || order.status === "running";

                  return (
                    <article
                      key={order._id}
                      className="border-2 border-nb-ink bg-nb-surface"
                    >
                      <div className="flex items-center justify-between gap-2 border-b-2 border-nb-ink/15 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "shrink-0 border-2 border-nb-ink px-1.5 py-[1px] font-mono text-[9px] font-bold uppercase tracking-[0.12em]",
                              style.chip,
                            )}
                          >
                            {style.label}
                          </span>
                          <span className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                            {order.label}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {timeAgo(order.createdAt)}
                          </span>
                          {cancellable && (
                            <button
                              type="button"
                              onClick={() => {
                                void cancelOrder({ orderId: order._id }).then(
                                  () => toast.success("Order cancelled."),
                                  () => toast.error("Could not cancel order."),
                                );
                              }}
                              title="Cancel order"
                              className="grid size-5 place-items-center border-2 border-nb-ink hover:bg-nb-red"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="px-3 py-3">
                        <p className="text-sm font-semibold leading-snug">
                          “{order.prompt}”
                        </p>

                        <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                          <span>
                            {order.step}/{order.plan.length} steps
                          </span>
                          <span>{order.progress}%</span>
                        </div>
                        <Progress value={order.progress} className="mt-1.5" />

                        <details className="group mt-2.5 border-t-2 border-nb-ink/10 pt-2">
                          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-nb-ink [&::-webkit-details-marker]:hidden">
                            Plan · {order.plan.length} steps
                            <span className="text-[9px] group-open:hidden">open</span>
                            <span className="hidden text-[9px] group-open:inline">
                              close
                            </span>
                          </summary>
                          <ol className="mt-2 flex flex-col gap-1.5">
                            {order.plan.map((step, index) => {
                              const done = index < order.step;
                              const active =
                                index === order.step && order.status === "running";
                              return (
                                <li
                                  key={`${step.title}-${index}`}
                                  className="flex items-start gap-2"
                                >
                                  <span
                                    className={cn(
                                      "mt-0.5 grid size-4 shrink-0 place-items-center border-2 border-nb-ink font-mono text-[8px]",
                                      done
                                        ? "bg-nb-lime"
                                        : active
                                          ? "bg-nb-orange"
                                          : "bg-nb-surface",
                                    )}
                                  >
                                    {done ? <Check className="size-2.5" /> : index + 1}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block font-mono text-[10px] font-bold uppercase tracking-wide">
                                      {step.title}
                                    </span>
                                    <span className="block font-mono text-[10px] leading-4 text-muted-foreground">
                                      {step.detail}
                                    </span>
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </details>

                        {order.result && (
                          <p className="mt-2 border-t-2 border-nb-ink/10 pt-2 font-mono text-[10px] text-muted-foreground">
                            {order.result}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </Panel>
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <Panel label="Telemetry" tone="blue" bodyClassName="px-4 py-2">
              <Row label="Status">
                <StatusPill status={bot.status} className="float-right" />
              </Row>
              <Row label="Uptime">
                {uptimeSince(bot.workerConnectedAt ?? bot.createdAt)}
              </Row>
              <Row label="Last seen">{timeAgo(bot.lastSeenAt)}</Row>
              <Row label="Completed">{bot.ordersCompleted} orders</Row>
              <Row label="Runtime">
                <button
                  type="button"
                  onClick={() => {
                    void setMode({
                      botId: id,
                      mode: bot.mode === "live" ? "simulated" : "live",
                    }).then(
                      () =>
                        toast.success(
                          bot.mode === "live"
                            ? "Switched to simulation."
                            : "Switched to live. Start the worker.",
                        ),
                      () => toast.error("Could not switch runtime mode."),
                    );
                  }}
                  className="underline decoration-2 underline-offset-2 hover:bg-nb-lime"
                >
                  {bot.mode === "live" ? "Live → switch to sim" : "Sim → switch to live"}
                </button>
              </Row>
              <div className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="nb-label text-muted-foreground">Auto-reconnect</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {bot.autoReconnect ? "enabled" : "disabled"}
                  </p>
                </div>
                <Switch
                  checked={bot.autoReconnect}
                  onCheckedChange={() =>
                    void toggleAutoReconnect({ botId: id }).catch(() =>
                      toast.error("Could not update auto-reconnect."),
                    )
                  }
                />
              </div>
            </Panel>

            <LoadoutInspector bot={bot} />

            <Panel label="Connection" tone="sand" bodyClassName="px-4 py-2">
              <Row label="Host">{bot.host}</Row>
              <Row label="Port">{bot.port}</Row>
              <Row label="Username">{bot.username}</Row>
              <Row label="Version">{bot.version}</Row>
              <Row label="Auth">{bot.authMode}</Row>
            </Panel>

            <Panel
              label="Worker bridge"
              tone="orange"
              bodyClassName="p-4 flex flex-col gap-3"
            >
              <div>
                <p className="nb-label mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <KeyRound className="size-3" /> Bot key
                </p>
                <div className="flex items-stretch border-2 border-nb-ink bg-nb-surface">
                  <code className="min-w-0 flex-1 truncate px-2 py-1.5 font-mono text-[10px]">
                    {bot.workerKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(bot.workerKey, "Bot key")}
                    className="shrink-0 border-l-2 border-nb-ink px-2 hover:bg-nb-lime"
                    title="Copy bot key"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="nb-label mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <Server className="size-3" /> Worker base URL
                </p>
                <div className="flex items-stretch border-2 border-nb-ink bg-nb-surface">
                  <code className="min-w-0 flex-1 truncate px-2 py-1.5 font-mono text-[10px]">
                    {siteUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(siteUrl, "Base URL")}
                    className="shrink-0 border-l-2 border-nb-ink px-2 hover:bg-nb-lime"
                    title="Copy base URL"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="nb-label flex items-center gap-1.5 text-muted-foreground">
                    <Terminal className="size-3" /> Start daemon
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopy(startCommand, "Start command")}
                    className="flex shrink-0 items-center gap-1 border-2 border-nb-ink bg-nb-surface px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] hover:bg-nb-lime"
                  >
                    <Copy className="size-3" /> Copy
                  </button>
                </div>
                <pre className="overflow-x-auto border-2 border-nb-ink bg-nb-ink px-2.5 py-2 font-mono text-[9px] leading-5 whitespace-pre-wrap break-all text-nb-paper">
                  <code>{startCommand}</code>
                </pre>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                  Run from the repo root · Node 20+
                </p>
              </div>

              <div className="border-2 border-nb-ink bg-nb-surface px-2.5 py-2 font-mono text-[10px] leading-5">
                <p className="text-muted-foreground"># three routes</p>
                <p>POST /worker/claim</p>
                <p>POST /worker/report</p>
                <p>POST /worker/heartbeat</p>
              </div>

              <p className="text-[11px] leading-5 text-nb-ink/75">
                {bot.mode === "simulated"
                  ? "Simulation mode runs the plan in the cloud. Start the worker after switching this bot to live."
                  : "Run the companion worker on an always-on machine; it claims orders from this console over HTTPS."}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void rotateWorkerKey({ botId: id }).then(
                      () => toast.success("Worker key rotated. Restart the worker."),
                      () => toast.error("Could not rotate the key."),
                    );
                  }}
                >
                  Rotate key
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <a href="/#runtime">Setup guide</a>
                </Button>
              </div>
            </Panel>

            <Panel
              label="Activity"
              tone="ink"
              bodyClassName="p-0"
              action={
                <span className="font-mono text-[10px] text-nb-paper/70">
                  live
                </span>
              }
            >
              <div className="nb-scroll max-h-[360px] overflow-y-auto">
                <ul className="divide-y-2 divide-nb-ink/10">
                  {events?.length === 0 && (
                    <li className="px-4 py-6 text-center font-mono text-[11px] text-muted-foreground">
                      No log lines yet.
                    </li>
                  )}
                  {events?.map((event) => (
                    <li key={event._id} className="flex gap-2.5 px-3.5 py-2.5">
                      <span
                        className={cn(
                          "mt-1 size-2 shrink-0 border border-nb-ink",
                          levelColor[event.level] ?? "bg-nb-sand",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                          {clock(event.createdAt)}
                        </p>
                        <p className="mt-0.5 break-words font-mono text-[10px] leading-4">
                          {event.message}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </aside>
        </div>
      </main>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <p className="nb-label text-muted-foreground">Danger zone</p>
            <DialogTitle className="font-display text-xl tracking-tight uppercase">
              Remove {bot.name}?
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              This deletes the bot, its full order history and every log line.
              The Minecraft account itself is untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Keep bot
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remove bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
