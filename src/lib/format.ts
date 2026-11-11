export function timeAgo(timestamp?: number): string {
  if (!timestamp) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function clock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function uptimeSince(timestamp?: number): string {
  if (!timestamp) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/**
 * The HTTP-actions host the companion worker talks to.
 * `npx convex dev` sets VITE_CONVEX_SITE_URL for local deployments, where the
 * site host is a different port; cloud deployments are derived.
 */
export function convexSiteUrl(): string {
  const site = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
  if (site) return site.replace(/\/$/, "");
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!url) return "https://your-deployment.convex.site";
  return url.replace(".convex.cloud", ".convex.site").replace(/\/$/, "");
}
