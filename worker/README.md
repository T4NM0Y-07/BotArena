# OVERSEER worker

The web app is the control room. This worker is the part that actually stays
connected to a Minecraft server, 24/7. It polls the console for orders over
HTTPS, executes them with [Mineflayer](https://github.com/PrismarineJS/mineflayer),
and reports every step back.

Run it on anything that stays on: a small VPS, a Raspberry Pi, a spare laptop,
a home server. The app itself does not need to be open.

## 1. Requirements

- Node.js 20+ (or Bun)
- A Java Edition server you can reach from the worker machine
- A Minecraft account. Offline-mode servers take any username; Microsoft-mode
  servers need a Microsoft account the worker can log into (first login opens a
  device-code prompt in the terminal).

## 2. Install

```bash
cd worker
npm install          # or: bun install
```

`mineflayer-pathfinder` is optional but recommended — without it the worker can
only reach blocks and mobs that are already within arm's range.

## 3. Get the bot key

Open a bot in the console (`/bot/<id>`) and copy:

- **Worker base URL** — your Convex HTTP-actions host, e.g.
  `https://polished-buzzard-477.convex.site`
- **Bot key** — the 32-character key in the *Worker bridge* panel

Switch the bot to **Live** mode in the telemetry panel. Simulation mode never
touches the game.

## 4. Start it

```bash
OVERSEER_URL="https://your-deployment.convex.site" \
OVERSEER_KEY="<bot key>" \
node overseer-worker.mjs
```

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OVERSEER_POLL_MS` | `4000` | How often the worker asks for work |
| `OVERSEER_HEARTBEAT_MS` | `20000` | Heartbeat interval (see note below) |

## 5. Keep it running (systemd)

```ini
# /etc/systemd/system/overseer-worker.service
[Unit]
Description=OVERSEER Minecraft worker
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/overseer/worker
Environment=OVERSEER_URL=https://your-deployment.convex.site
Environment=OVERSEER_KEY=replace-with-your-bot-key
ExecStart=/usr/bin/node overseer-worker.mjs
Restart=always
RestartSec=5
User=overseer

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now overseer-worker
journalctl -u overseer-worker -f
```

`Restart=always` is what makes the setup survive reboots and crashed processes;
`auto-reconnect` inside the worker handles in-game drops, kicks and server
restarts.

## What the worker can execute today

| Order intent | Behaviour |
| --- | --- |
| Gather / mine | Paths to the nearest matching block and mines up to the requested count |
| Farm | Harvests mature crops nearby |
| Deliver / stash | Deposits non-tool items into the nearest chest |
| Follow | Continuously follows the named player (or the nearest other player) |
| Guard | Attacks hostile mobs within 12 blocks until told to stop |
| Explore | Walks to a random nearby waypoint |
| Chat | Sends the requested line in public chat |
| Sleep | Uses the nearest bed if one exists |
| Build | Scouting and block placement only — it needs materials and a precise blueprint |

Everything else falls back to a general task: the worker reports the plan steps
but does not invent gameplay. Plans come from the deterministic parser in
`src/convex/lib/parseOrder.ts`, so what you preview in the browser is exactly
what the worker receives.

## Notes and limits

- **One worker per bot key.** Two workers on the same key would fight over the
  same account.
- **The key is a credential.** Anyone with it can claim orders for that bot.
  Rotate it from the console if it leaks.
- **A worker that dies mid-order leaves the order in `running`.** Restart the
  worker; cancel the stale order from the console and send it again.
- **The Microsoft login flow is interactive** the first time. Run the worker in
  a terminal once to complete it, then move the cached credentials to your
  service account.
- **Respect server rules.** Automating a public server may violate its terms.
  Run this on servers you own or are allowed to automate on.
