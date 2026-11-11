import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexConnectionState } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const BotDetail = lazy(() => import("./pages/BotDetail.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * `npx convex dev` points VITE_CONVEX_URL at 127.0.0.1, which only resolves on
 * the machine running the backend. When the app is opened from any other
 * origin (VM preview, another device, a tunnel), loopback is unreachable, so
 * talk to the dev proxy on this origin instead — Vite forwards /convex to the
 * local deployment (HTTP + WebSocket). Cloud deployments keep their own URL.
 */
const LOOPBACK_URL = /\/\/(127\.0\.0\.1|localhost)([:/]|$)/;

function resolveConvexUrl(): string {
  const url = (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim();
  if (!url) return "";
  // The /convex proxy below only exists on the Vite dev server. A production
  // build that inlined a loopback URL has no backend at all, so keep the URL
  // as-is and let the guard report it instead of dialling a proxy that is not
  // there (a static host answers the WebSocket upgrade with HTML).
  if (!import.meta.env.DEV) return url;
  const browserIsLocal = ["localhost", "127.0.0.1", "[::1]"].includes(
    window.location.hostname,
  );
  return LOOPBACK_URL.test(url) && !browserIsLocal
    ? `${window.location.origin}/convex`
    : url;
}

const resolvedConvexUrl = resolveConvexUrl();
const backendUnreachable =
  !resolvedConvexUrl ||
  (!import.meta.env.DEV && LOOPBACK_URL.test(resolvedConvexUrl));
const convex = backendUnreachable
  ? null
  : new ConvexReactClient(resolvedConvexUrl);

function BackendMissing({ url }: { url: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-nb-paper p-6 text-nb-ink">
      <div className="max-w-lg border-[3px] border-nb-ink bg-nb-paper p-6 shadow-[6px_6px_0_0_var(--nb-ink)]">
        <p className="font-display text-xl">Backend not configured</p>
        <p className="mt-3 font-mono text-xs leading-5 break-words">
          This build points at{" "}
          <span className="font-bold">{url || "(no VITE_CONVEX_URL)"}</span>,
          which is not a reachable Convex deployment. Sign-in and every bot
          screen stay empty until a deployment URL is baked in at build time.
        </p>
      </div>
    </main>
  );
}

/**
 * A dead or unreachable deployment used to leave every screen on a silent
 * spinner. Say it out loud instead, so the operator knows it is the backend
 * and not the page.
 */
function BackendStatus() {
  const connection = useConvexConnectionState();
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (connection.isWebSocketConnected) {
      setStalled(false);
      return;
    }
    const timer = setTimeout(() => setStalled(true), 8000);
    return () => clearTimeout(timer);
  }, [connection.isWebSocketConnected]);

  if (!stalled) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-[3px] border-nb-ink bg-nb-orange px-4 py-2.5 text-center font-mono text-[11px] leading-5 text-nb-ink">
      Cannot reach the BotArena backend at{" "}
      <span className="font-bold">
        {(import.meta.env.VITE_CONVEX_URL as string) || "(unset)"}
      </span>
      . Pages that need data will not load until it is reachable.
    </div>
  );
}



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      {convex ? (
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <BackendStatus />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/bot/:botId"
                element={
                  <RequireAuth>
                    <BotDetail />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
      ) : (
        <BackendMissing url={resolvedConvexUrl} />
      )}
    </RootErrorBoundary>
  </StrictMode>,
);
