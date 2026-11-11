import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CircleDot,
  MessageSquareCode,
  RadioTower,
  Boxes,
  Check,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import {
  LogoMark,
  ModeTag,
  Wordmark,
} from "@/components/botarena-ui";
import { PixelAvatar } from "@/components/botarena-ui";
import { StatusPill } from "@/components/botarena-ui";
import { useAuth } from "@/hooks/use-auth";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

const mockPlan = [
  { title: "Find resources", detail: "Scan 64 blocks for iron ore." },
  { title: "Gather", detail: "Collect 32 × iron ore, safe terrain only." },
  { title: "Secure haul", detail: "Deposit overflow into the base chest." },
  { title: "Report", detail: 'Chat “Got 32 iron ore.”' },
];

const orderExamples = [
  {
    prompt: "mine 32 iron and stash it in the base chest",
    label: "Gather",
    quantity: "32 × iron ore",
    tone: "bg-nb-lime",
  },
  {
    prompt: "follow me and keep the mobs off my back",
    label: "Follow",
    quantity: "operator escort",
    tone: "bg-nb-blue",
  },
  {
    prompt: "harvest the wheat and replant every tile",
    label: "Farm",
    quantity: "field loop",
    tone: "bg-nb-orange",
  },
  {
    prompt: "build a small shelter before nightfall",
    label: "Build",
    quantity: "5×5 shelter",
    tone: "bg-nb-pink",
  },
  {
    prompt: "guard the base while I'm offline",
    label: "Guard",
    quantity: "perimeter patrol",
    tone: "bg-nb-sand",
  },
  {
    prompt: 'say "good morning" in chat',
    label: "Chat",
    quantity: "one line",
    tone: "bg-nb-lime",
  },
];

const steps = [
  {
    number: "01",
    tone: "bg-nb-lime",
    title: "Deploy an account",
    copy: "Add the server address, port and bot username. Pick simulation to see the flow instantly, or live to hand it a real Minecraft account.",
    note: "Takes about 30 seconds",
    icon: Boxes,
  },
  {
    number: "02",
    tone: "bg-nb-orange",
    title: "Type like a person",
    copy: "“Mine 32 iron and stash it at base.” The parser turns the sentence into a labelled, ordered plan — no slash-command grammar to memorise.",
    note: "Deterministic, no token bill",
    icon: MessageSquareCode,
  },
  {
    number: "03",
    tone: "bg-nb-blue",
    title: "Leave it running",
    copy: "The worker holds the connection on any always-on machine, reconnects after drops, and streams every step back into the console log.",
    note: "Self-hosted, 24/7",
    icon: RadioTower,
  },
];

const chain = ["Vanilla", "Paper", "Purpur", "Fabric", "Spigot", "Forge"];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-nb-paper text-nb-ink">
      <header className="sticky top-0 z-40 border-b-[3px] border-nb-ink bg-nb-paper/95 backdrop-blur-[2px]">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-4 px-5">
          <Link to="/">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: "How it works", href: "#how" },
              { label: "Orders", href: "#orders" },
              { label: "Runtime", href: "#runtime" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="border-2 border-transparent px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.14em] uppercase hover:border-nb-ink hover:bg-nb-sand"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Button asChild size="sm">
            <Link to="/dashboard">
              {isAuthenticated ? "Open console" : "Deploy a bot"}
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 nb-grid opacity-60" />
          <div className="pointer-events-none absolute -top-10 right-[12%] hidden size-24 rotate-6 border-[3px] border-nb-ink bg-nb-orange lg:block" />
          <div className="pointer-events-none absolute bottom-16 left-[4%] hidden size-14 -rotate-12 border-[3px] border-nb-ink bg-nb-blue xl:block" />

          <div className="relative mx-auto grid w-full max-w-[1180px] items-center gap-14 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 border-2 border-nb-ink bg-nb-surface px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.16em] uppercase">
                <span className="size-1.5 bg-nb-lime ring-2 ring-nb-ink" />
                Minecraft runtime · always on
              </div>

              <h1 className="mt-6 font-display text-[clamp(2.6rem,6.2vw,4.4rem)] leading-[0.92] tracking-tight uppercase">
                Keep your bot
                <br />
                online.
                <br />
                <span className="mt-2 inline-block border-[3px] border-nb-ink bg-nb-lime px-3 py-1 shadow-[6px_6px_0_0_var(--color-nb-ink)]">
                  Talk like a human.
                </span>
              </h1>

              <p className="mt-7 max-w-md text-base leading-7 text-nb-ink/80 sm:text-lg">
                BotArena holds a Minecraft account on your server around the
                clock. Type an ordinary sentence, it becomes a step-by-step job,
                and every move lands in one control room.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/dashboard">
                    Deploy your first bot
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#orders">See example orders</a>
                </Button>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] font-bold tracking-[0.14em] uppercase text-nb-ink/70">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5" /> No plugins
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5" /> Auto-reconnect
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5" /> Self-hosted worker
                </span>
              </div>
            </motion.div>

            {/* Console mock */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -inset-2 translate-x-2 translate-y-2 border-[3px] border-nb-ink bg-nb-sand" />
              <div className="relative nb-panel">
                <div className="flex items-center justify-between gap-3 border-b-[3px] border-nb-ink bg-nb-ink px-4 py-2.5 text-nb-paper">
                  <span className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.14em] uppercase">
                    <CircleDot className="size-3 text-nb-lime" />
                    BotArena / console
                  </span>
                  <span className="flex gap-1">
                    <span className="size-2 border border-nb-paper/60" />
                    <span className="size-2 border border-nb-paper/60" />
                    <span className="size-2 bg-nb-lime" />
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <PixelAvatar seed="pioneer" size="sm" />
                      <div>
                        <p className="font-display text-sm tracking-tight">
                          PIONEER
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          play.ironvale.net:25565
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ModeTag mode="live" />
                      <StatusPill status="online" />
                    </div>
                  </div>

                  <div className="mt-4 border-2 border-nb-ink bg-nb-sand p-3">
                    <p className="nb-label text-nb-ink/60">Operator</p>
                    <p className="mt-1 text-sm font-semibold leading-snug">
                      “mine 32 iron and stash it in the base chest”
                    </p>
                  </div>

                  <div className="mt-3 border-2 border-nb-ink bg-nb-surface">
                    <div className="flex items-center justify-between border-b-2 border-nb-ink bg-nb-lime px-3 py-1.5">
                      <span className="nb-label">Parsed plan</span>
                      <span className="nb-label text-[9px]">Gather · 32 iron ore</span>
                    </div>
                    <ul className="divide-y-2 divide-nb-ink/10">
                      {mockPlan.map((step, index) => {
                        const done = index < 2;
                        const active = index === 2;
                        return (
                          <li
                            key={step.title}
                            className="flex items-start gap-2.5 px-3 py-2"
                          >
                            <span
                              className={`mt-0.5 grid size-4 shrink-0 place-items-center border-2 border-nb-ink text-[9px] font-bold ${
                                done
                                  ? "bg-nb-lime"
                                  : active
                                    ? "bg-nb-orange"
                                    : "bg-nb-surface"
                              }`}
                            >
                              {done ? "✓" : index + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold leading-tight">
                                {step.title}
                              </span>
                              <span className="block font-mono text-[10px] leading-4 text-muted-foreground">
                                {step.detail}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-2 border-nb-ink bg-nb-ink px-3 py-2 font-mono text-[10px] text-nb-paper">
                    <span className="text-nb-lime">$</span>
                    <span className="truncate">
                      3/4 secure haul — depositing 32 iron ore
                    </span>
                    <span className="ml-auto h-3 w-1.5 shrink-0 animate-pulse bg-nb-lime" />
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-3 rotate-[-3deg] border-[3px] border-nb-ink bg-nb-orange px-3 py-1.5 shadow-[4px_4px_0_0_var(--color-nb-ink)] sm:-left-6">
                <p className="font-display text-sm leading-none">99.98% UPTIME</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Compatibility strip */}
        <section className="border-y-[3px] border-nb-ink bg-nb-surface">
          <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5">
            <span className="nb-label text-muted-foreground">Runs on</span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {chain.map((name, index) => (
                <span
                  key={name}
                  className="flex items-center gap-5 font-mono text-[11px] font-bold tracking-[0.12em] uppercase"
                >
                  {name}
                  {index < chain.length - 1 && (
                    <span className="hidden size-1 bg-nb-ink/30 sm:block" />
                  )}
                </span>
              ))}
            </div>
            <span className="ml-auto hidden font-mono text-[10px] text-muted-foreground uppercase sm:block">
              Java Edition · 1.8 – latest
            </span>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto w-full max-w-[1180px] px-5 py-16 md:py-24">
          <motion.div {...fadeUp}>
            <p className="nb-label text-muted-foreground">01 — How it works</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <h2 className="max-w-2xl font-display text-3xl leading-[1.02] tracking-tight uppercase sm:text-4xl">
                Three moves. Then it just runs.
              </h2>
              <p className="max-w-xs font-mono text-[11px] leading-5 text-muted-foreground">
                No macros, no server plugins, no command syntax. Deploy once and
                keep typing.
              </p>
            </div>
          </motion.div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.article
                key={step.number}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.07 }}
                className="nb-panel nb-panel-lift flex flex-col"
              >
                <div className="flex items-center justify-between border-b-[3px] border-nb-ink px-4 py-2.5">
                  <span className="nb-label">{step.number}</span>
                  <span className={`size-3 border-2 border-nb-ink ${step.tone}`} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span
                    className={`grid size-11 place-items-center border-[3px] border-nb-ink ${step.tone}`}
                  >
                    <step.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-nb-ink/75">
                    {step.copy}
                  </p>
                  <p className="mt-5 border-t-2 border-nb-ink/15 pt-3 font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                    {step.note}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Order examples */}
        <section
          id="orders"
          className="border-y-[3px] border-nb-ink bg-nb-sand/50"
        >
          <div className="mx-auto w-full max-w-[1180px] px-5 py-16 md:py-24">
            <motion.div {...fadeUp} className="max-w-2xl">
              <p className="nb-label text-muted-foreground">02 — Order grammar</p>
              <h2 className="mt-2 font-display text-3xl leading-[1.02] tracking-tight uppercase sm:text-4xl">
                One sentence in. A plan out.
              </h2>
              <p className="mt-4 text-base leading-7 text-nb-ink/75">
                Orders are parsed locally and deterministically, so the bot never
                invents work you did not ask for. Every order is broken into
                visible steps you can cancel mid-flight.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orderExamples.map((example, index) => (
                <motion.div
                  key={example.prompt}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: (index % 3) * 0.06 }}
                  className="nb-panel-sm nb-panel-lift flex flex-col justify-between gap-5 bg-nb-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="nb-label flex items-center gap-2">
                      <span
                        className={`size-2.5 border-2 border-nb-ink ${example.tone}`}
                      />
                      {example.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold leading-snug">
                    “{example.prompt}”
                  </p>
                  <div className="flex items-center justify-between border-t-2 border-nb-ink/15 pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {example.quantity}
                    </span>
                    <ArrowRight className="size-4" />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link to="/dashboard">
                  Try one on a bot
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Simulation mode works without a game server
              </span>
            </div>
          </div>
        </section>

        {/* Runtime */}
        <section id="runtime" className="mx-auto w-full max-w-[1180px] px-5 py-16 md:py-24">
          <motion.div
            {...fadeUp}
            className="grid gap-0 border-[3px] border-nb-ink bg-nb-ink text-nb-paper shadow-[8px_8px_0_0_var(--color-nb-lime)] lg:grid-cols-[1fr_1.05fr]"
          >
            <div className="p-7 sm:p-10">
              <p className="nb-label text-nb-lime">03 — The runtime</p>
              <h2 className="mt-3 font-display text-3xl leading-[1.02] tracking-tight uppercase sm:text-4xl">
                Uptime is a machine that never sleeps.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-nb-paper/75">
                The control room lives in the cloud. The actual Minecraft
                connection runs in a small Mineflayer worker on any always-on
                box: a VPS, a spare laptop, a Raspberry Pi. If the connection
                drops, it comes back on its own.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Claims one order at a time over HTTPS",
                  "Reconnects with exponential backoff",
                  "Reports progress and chat back to the log",
                  "Worker key can be rotated from the console",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 size-3 shrink-0 border-2 border-nb-paper bg-nb-lime" />
                    <span className="text-sm leading-6 text-nb-paper/85">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 inline-flex items-center gap-2 border-2 border-nb-paper/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-nb-paper/70">
                <RadioTower className="size-3.5 text-nb-lime" />
                Companion worker included
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <div className="flex h-full flex-col border-[3px] border-nb-ink bg-nb-surface text-nb-ink shadow-[6px_6px_0_0_var(--color-nb-lime)]">
                <div className="flex items-center justify-between border-b-[3px] border-nb-ink bg-nb-sand px-3 py-2">
                  <span className="nb-label">worker / terminal</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    node 20
                  </span>
                </div>
                <pre className="nb-scroll flex-1 overflow-x-auto p-4 font-mono text-[11px] leading-6 sm:text-xs">
{`$ npx botarena-worker \\
    --key 8f2c…a91d \\
    --host play.ironvale.net:25565

`}<span className="text-emerald-700">[worker]</span>{` connected as Pioneer
`}<span className="text-emerald-700">[worker]</span>{` heartbeat ok · 12ms
`}<span className="text-emerald-700">[worker]</span>{` claimed: gather 32 iron ore
`}<span className="text-sky-700">[bot]</span>{` 2/4 secure haul — chest found
`}<span className="text-emerald-700">[worker]</span>{` reporting progress …
`}<span className="inline-block h-3 w-1.5 animate-pulse bg-nb-ink align-middle" />
                </pre>
                <p className="border-t-[3px] border-nb-ink bg-nb-surface px-4 py-2 font-mono text-[10px] text-muted-foreground">
                  See worker/README.md for setup and systemd.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-[1180px] px-5 pb-20">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden border-[3px] border-nb-ink bg-nb-lime p-7 shadow-[8px_8px_0_0_var(--color-nb-ink)] sm:p-12"
          >
            <div className="pointer-events-none absolute inset-0 nb-dots opacity-20" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="nb-label">Ready when you are</p>
                <h2 className="mt-3 max-w-xl font-display text-3xl leading-[0.98] tracking-tight uppercase sm:text-5xl">
                  Put a bot on the server tonight.
                </h2>
              </div>
              <div className="lg:justify-self-end">
                <p className="max-w-sm text-sm leading-6 text-nb-ink/80">
                  Spin up a simulated bot to test the order flow, then plug in your
                  server details when you are ready. Bring your own Minecraft
                  account.
                </p>
                <Button asChild size="lg" variant="outline" className="mt-5 bg-nb-surface">
                  <Link to="/dashboard">
                    Open the command deck
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t-[3px] border-nb-ink bg-nb-surface">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="size-8" />
            <div>
              <p className="font-display text-sm tracking-tight">BotArena</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                Minecraft operations console
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <a href="#how" className="hover:text-nb-ink hover:underline">
              How it works
            </a>
            <a href="#runtime" className="hover:text-nb-ink hover:underline">
              Runtime
            </a>
            <Link to="/auth" className="hover:text-nb-ink hover:underline">
              Sign in
            </Link>
            <span className="text-muted-foreground/70">
              Unofficial · not affiliated with Mojang
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
