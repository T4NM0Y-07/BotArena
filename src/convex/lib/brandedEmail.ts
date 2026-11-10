/**
 * Branded transactional email for OVERSEER.
 *
 * The platform's OTP endpoint uses fixed, generic wording, so sign-in codes and
 * welcome mail go through the shared VLY email integration instead. Everything
 * is inline-styled for email clients and built from tables for Outlook.
 */

const INK = "#171510";
const PAPER = "#f7f2e7";
const SAND = "#e7dcc6";
const LIME = "#c7f464";
const ORANGE = "#ff7a3d";
const MUTED = "#6b6455";
const RULE = "#d3c8b2";
const BODY_TEXT = "#3b372e";

const DISPLAY = "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BODY = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

export type BrandedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Links must be absolute in email. The browser passes its own origin when it
 * asks for the welcome mail, because the deployment's SITE_URL points at the
 * Convex HTTP host rather than the app frontend.
 */
function appLink(appUrl: string | undefined, path: string) {
  if (!appUrl) return "";
  const base = appUrl.replace(/\/+$/, "");
  return `${base}${path}`;
}

function shell({
  preheader,
  kicker,
  heading,
  content,
  appUrl,
}: {
  preheader: string;
  kicker: string;
  heading: string;
  content: string;
  appUrl?: string;
}) {
  const site = appLink(appUrl, "/");
  return `<!doctype html>
<html lang="en" style="color-scheme:light only;">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>OVERSEER</title>
</head>
<body style="margin:0;padding:0;background:${SAND};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SAND};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${PAPER};border:3px solid ${INK};border-collapse:collapse;">
  <tr>
    <td style="background:${INK};padding:16px 22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:${MONO};font-size:17px;font-weight:bold;letter-spacing:4px;color:${LIME};">OVERSEER</td>
          <td align="right" style="font-family:${MONO};font-size:9px;letter-spacing:2px;color:#b8b0a0;">REMOTE MC OPS</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="height:8px;background:${LIME};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td style="padding:30px 26px 6px;">
      <p style="margin:0 0 10px;font-family:${MONO};font-size:10px;font-weight:bold;letter-spacing:2.5px;color:${ORANGE};text-transform:uppercase;">${escapeHtml(kicker)}</p>
      <h1 style="margin:0;font-family:${DISPLAY};font-size:30px;font-weight:900;line-height:1.06;letter-spacing:-0.4px;text-transform:uppercase;color:${INK};">${escapeHtml(heading)}</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 26px 30px;font-family:${BODY};font-size:15px;line-height:25px;color:${BODY_TEXT};">
      ${content}
    </td>
  </tr>
  <tr>
    <td style="padding:16px 26px 20px;border-top:2px solid ${RULE};">
      <p style="margin:0;font-family:${MONO};font-size:9px;letter-spacing:1.6px;line-height:18px;text-transform:uppercase;color:${MUTED};">
        OVERSEER · remote Minecraft operations<br />
        ${site ? `<a href="${site}" style="color:${INK};text-decoration:underline;">${escapeHtml(site)}</a> · ` : ""}transactional message about your operator account
      </p>
    </td>
  </tr>
</table>
<p style="margin:14px 0 0;font-family:${MONO};font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:${MUTED};">
  No passwords. No shortcuts. Just the console.
</p>
</td></tr>
</table>
</body>
</html>`;
}

function textFooter(appUrl?: string) {
  const site = appLink(appUrl, "/");
  return `\n\n--\nOVERSEER // remote Minecraft operations${site ? `\n${site}` : ""}\nTransactional message about your operator account.\nNo passwords. No shortcuts. Just the console.`;
}

export function otpEmail({ email, code }: { email: string; code: string }): BrandedEmail {
  const safeEmail = escapeHtml(email);
  const content = `
    <p style="margin:0 0 18px;">
      This six-digit code signs you in to the OVERSEER console. It is tied to
      <strong style="font-family:${MONO};font-size:13px;color:${INK};">${safeEmail}</strong>,
      works once, and expires in <strong>15 minutes</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:3px solid ${INK};background:#fffdf6;">
      <tr>
        <td align="center" style="padding:18px 8px 16px;font-family:${MONO};font-size:38px;font-weight:bold;letter-spacing:12px;color:${INK};">
          ${escapeHtml(code)}
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0;font-family:${MONO};font-size:9px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:${MUTED};">
      One-time access code · do not forward
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background:${SAND};border-left:6px solid ${LIME};">
      <tr>
        <td style="padding:12px 14px;font-family:${BODY};font-size:13px;line-height:22px;color:${BODY_TEXT};">
          <strong style="color:${INK};">Didn't request this?</strong>
          Someone typed your address at the OVERSEER console. No action needed —
          the code is useless without this inbox.
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;line-height:22px;color:${MUTED};">
      Access is email-only by design. We never ask for a password, and there is
      no shortcut into the console.
    </p>`;

  return {
    subject: `OVERSEER // access code ${code}`,
    html: shell({
      preheader: `Your one-time OVERSEER access code is ${code}. Expires in 15 minutes.`,
      kicker: "Auth / verification",
      heading: "Your access code",
      content,
    }),
    text: `OVERSEER // REMOTE MC OPS
=========================
YOUR ACCESS CODE

     ${code}

This six-digit code signs you in to the OVERSEER console. It is tied to ${email},
works once, and expires in 15 minutes.

ONE-TIME ACCESS CODE / DO NOT FORWARD

Didn't request this? Someone typed your address at the OVERSEER console. No
action needed — the code is useless without this inbox.

Access is email-only by design. We never ask for a password, and there is no
shortcut into the console.${textFooter()}`,
  };
}

function operatorLabel(email: string, name?: string | null) {
  if (name?.trim()) return name.trim();
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!local) return "Operator";
  return local.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function step(number: string, title: string, detail: string) {
  return `
    <tr>
      <td width="40" valign="top" style="padding:0 12px 16px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:${INK};">
          <tr><td width="30" height="30" align="center" style="font-family:${MONO};font-size:12px;font-weight:bold;color:${LIME};">${number}</td></tr>
        </table>
      </td>
      <td valign="top" style="padding:0 0 16px;font-family:${BODY};font-size:14px;line-height:22px;color:${BODY_TEXT};">
        <strong style="display:block;font-family:${BODY};font-size:14px;text-transform:uppercase;letter-spacing:0.4px;color:${INK};">${title}</strong>
        ${detail}
      </td>
    </tr>`;
}

export function welcomeEmail({
  email,
  name,
  appUrl,
}: {
  email: string;
  name?: string | null;
  appUrl?: string;
}): BrandedEmail {
  const operator = escapeHtml(operatorLabel(email, name));
  const dashboard = appLink(appUrl, "/dashboard");
  const cta = dashboard
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
      <tr>
        <td align="center" style="background:${LIME};border:3px solid ${INK};">
          <a href="${dashboard}" style="display:inline-block;padding:13px 24px;font-family:${MONO};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${INK};text-decoration:none;">
            Open the console →
          </a>
        </td>
      </tr>
    </table>`
    : "";
  const content = `
    <p style="margin:0 0 18px;">
      Operator <strong style="color:${INK};">${operator}</strong> — your account is open.
      One trial bot is on the house, and the console is already waiting.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;border:3px solid ${INK};background:#fffdf6;">
      <tr><td style="padding:16px 16px 2px;">
        <p style="margin:0 0 14px;font-family:${MONO};font-size:9px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">
          First shift / three moves
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${step("01", "Deploy a Minecraft account", "Add host, port, username and version. We ping the server and store its MOTD before you commit.")}
          ${step("02", "Write the first order", "Plain English — “mine 32 iron”, “guard the base”, “build a shelter before night”. The console turns it into a step-by-step plan.")}
          ${step("03", "Start the worker", "Copy the one-line command from the Worker bridge card. Heartbeats bring telemetry, inventory and order progress online.")}
        </table>
      </td></tr>
    </table>
    ${cta}
    <p style="margin:0 0 14px;font-size:13px;line-height:22px;">
      Not ready for a real server? Leave the bot in simulation and the whole
      command plan still runs in the cloud. Switch to live when you want the
      worker talking to Minecraft.
    </p>
    <p style="margin:0;font-family:${MONO};font-size:10px;line-height:19px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">
      Trial includes 1 always-on bot · full rosters unlock from Billing
    </p>`;

  return {
    subject: "OVERSEER // clearance granted",
    html: shell({
      preheader: "Your operator console is live. One trial bot, email-only access, no password.",
      kicker: "Access / granted",
      heading: "Clearance granted.",
      content,
      appUrl,
    }),
    text: `OVERSEER // REMOTE MC OPS
=========================
CLEARANCE GRANTED

Operator ${operatorLabel(email, name)} — your account is open.
One trial bot is on the house, and the console is already waiting.

FIRST SHIFT / THREE MOVES

01  DEPLOY A MINECRAFT ACCOUNT
    Add host, port, username and version. We ping the server and store its
    MOTD before you commit.

02  WRITE THE FIRST ORDER
    Plain English — "mine 32 iron", "guard the base", "build a shelter before
    night". The console turns it into a step-by-step plan.

03  START THE WORKER
    Copy the one-line command from the Worker bridge card. Heartbeats bring
    telemetry, inventory and order progress online.

${dashboard ? `OPEN THE CONSOLE\n${dashboard}\n\n` : ""}Not ready for a real server? Leave the bot in simulation and the whole command
plan still runs in the cloud. Switch to live when you want the worker talking
to Minecraft.

TRIAL INCLUDES 1 ALWAYS-ON BOT · FULL ROSTERS UNLOCK FROM BILLING${textFooter(appUrl)}`,
  };
}

/**
 * Delivers mail through the project's existing integration gateway. The key is
 * a Convex environment variable and never reaches the browser.
 */
export async function sendBrandedEmail({
  to,
  subject,
  html,
  text,
}: { to: string } & BrandedEmail): Promise<void> {
  const key = process.env.VLY_INTEGRATION_KEY;
  if (!key) {
    throw new Error(
      "VLY_INTEGRATION_KEY is not set on this Convex deployment, so mail cannot be sent.",
    );
  }

  const base = (process.env.VLY_INTEGRATION_BASE_URL || "https://integrations.vly.ai")
    .replace(/\/+$/, "");

  const response = await fetch(`${base}/v1/email/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: [to],
      from: "noreply@project.freebuff.dev",
      subject,
      html,
      text,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
  };

  if (!response.ok || payload.success === false) {
    const detail = payload.error ? `: ${payload.error}` : "";
    throw new Error(`Email gateway rejected the message (HTTP ${response.status})${detail}`);
  }
}
