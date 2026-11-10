"use node";

import { v } from "convex/values";
import net from "node:net";

import { action } from "./_generated/server";

/**
 * Real Minecraft server-list ping (protocol handshake + status request).
 * Used by the setup wizard to verify a server before a bot is created.
 *
 * This only performs the anonymous status handshake — no account logs in.
 */

const PROTOCOL_VERSION = 765;
const TIMEOUT_MS = 6000;

type ServerStatus = {
  online: boolean;
  latencyMs?: number;
  version?: string;
  protocol?: number;
  playersOnline?: number;
  playersMax?: number;
  motd?: string;
  error?: string;
};

function encodeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let current = value >>> 0;
  do {
    let byte = current & 0x7f;
    current >>>= 7;
    if (current !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (current !== 0);
  return Buffer.from(bytes);
}

function encodeString(value: string): Buffer {
  const data = Buffer.from(value, "utf8");
  return Buffer.concat([encodeVarInt(data.length), data]);
}

function readVarInt(buffer: Buffer, offset: number): { value: number; size: number } | null {
  let value = 0;
  let size = 0;
  let byte = 0;

  do {
    if (offset + size >= buffer.length || size > 4) return null;
    byte = buffer[offset + size];
    value |= (byte & 0x7f) << (7 * size);
    size += 1;
  } while ((byte & 0x80) !== 0);

  return { value, size };
}

function flattenMotd(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenMotd).join("");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text : "";
    const extra = record.extra ? flattenMotd(record.extra) : "";
    return `${text}${extra}`;
  }
  return "";
}

function cleanMotd(value: unknown): string | undefined {
  const text = flattenMotd(value)
    .replace(/§[0-9a-fk-or]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 160) : undefined;
}

function friendlyError(error: NodeJS.ErrnoException): string {
  switch (error.code) {
    case "ECONNREFUSED":
      return "Nothing is listening on that host and port.";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "That hostname could not be resolved.";
    case "ETIMEDOUT":
      return "The server did not answer in time.";
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return "This server is unreachable from our network.";
    default:
      return "Could not reach this server. Check the host, port and firewall.";
  }
}

function pingServer(host: string, port: number): Promise<ServerStatus> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    let settled = false;

    const finish = (result: ServerStatus) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(TIMEOUT_MS);

    socket.on("connect", () => {
      const portBuffer = Buffer.alloc(2);
      portBuffer.writeUInt16BE(port);

      const handshake = Buffer.concat([
        Buffer.from([0x00]),
        encodeVarInt(PROTOCOL_VERSION),
        encodeString(host),
        portBuffer,
        Buffer.from([0x01]),
      ]);

      socket.write(Buffer.concat([encodeVarInt(handshake.length), handshake]));
      socket.write(Buffer.from([0x01, 0x00]));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      const packetLength = readVarInt(buffer, 0);
      if (!packetLength) return;
      if (buffer.length < packetLength.size + packetLength.value) return;

      let offset = packetLength.size;
      const packetId = readVarInt(buffer, offset);
      if (!packetId) return;
      offset += packetId.size;

      const stringLength = readVarInt(buffer, offset);
      if (!stringLength) return;
      offset += stringLength.size;

      const payload = buffer.subarray(offset, offset + stringLength.value).toString("utf8");

      try {
        const data = JSON.parse(payload) as {
          version?: { name?: string; protocol?: number };
          players?: { online?: number; max?: number };
          description?: unknown;
        };

        finish({
          online: true,
          latencyMs: Date.now() - startedAt,
          version: data.version?.name,
          protocol: data.version?.protocol,
          playersOnline: data.players?.online,
          playersMax: data.players?.max,
          motd: cleanMotd(data.description),
        });
      } catch {
        finish({
          online: false,
          error: "The server answered, but not with a status response. Is this a Java server?",
        });
      }
    });

    socket.on("timeout", () =>
      finish({ online: false, error: "The server did not answer in time." }),
    );
    socket.on("error", (error) =>
      finish({ online: false, error: friendlyError(error as NodeJS.ErrnoException) }),
    );
  });
}

export const verifyServer = action({
  args: { host: v.string(), port: v.number() },
  handler: async (_ctx, { host, port }): Promise<ServerStatus> => {
    const cleaned = host
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/\s+/g, "");

    if (!cleaned) {
      return { online: false, error: "Enter a server hostname, for example play.example.net." };
    }
    if (cleaned.includes(":") || cleaned.includes("/")) {
      return { online: false, error: "Use only the hostname here and put the port in the port field." };
    }

    const safePort = Math.round(port);
    if (!Number.isFinite(safePort) || safePort < 1 || safePort > 65535) {
      return { online: false, error: "Port must be between 1 and 65535." };
    }

    return await pingServer(cleaned, safePort);
  },
});
