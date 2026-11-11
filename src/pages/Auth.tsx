import { useAction } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { LogoMark, Wordmark } from "@/components/botarena-ui";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, RadioTower } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const sendWelcomeEmail = useAction(api.emails.sendWelcome);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      // First verified signup gets one branded welcome mail; repeat sign-ins
      // are rejected server-side, so this is safe to fire on every verify.
      // A fresh token can take a beat to reach the Convex client, so retry
      // only while the action still sees a signed-out request.
      const appUrl = window.location.origin;
      const deliverWelcome = async (attempt: number): Promise<void> => {
        const result = await sendWelcomeEmail({ appUrl });
        if (!result.sent && result.reason === "signed-out" && attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 450));
          await deliverWelcome(attempt + 1);
        }
      };
      void deliverWelcome(0).catch(() => undefined);
      navigate(redirect);
    } catch {
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  return (
    <div className="relative min-h-screen bg-nb-paper">
      <div className="pointer-events-none absolute inset-0 nb-grid opacity-60" />

      <header className="relative border-b-[3px] border-nb-ink bg-nb-paper/90">
        <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center justify-between px-5">
          <Link to="/">
            <Wordmark />
          </Link>
          <Link
            to="/"
            className="nb-label border-2 border-transparent px-2 py-1.5 text-muted-foreground hover:border-nb-ink hover:bg-nb-sand hover:text-nb-ink"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main className="relative mx-auto grid w-full max-w-[1040px] items-start gap-10 px-5 py-12 lg:grid-cols-[1fr_430px] lg:py-16">
        <section className="hidden lg:block">
          <p className="nb-label text-muted-foreground">Operator access</p>
          <h1 className="mt-3 max-w-md font-display text-4xl leading-[0.98] tracking-tight uppercase">
            Clock in. The bots are waiting.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-nb-ink/75">
            One console for every Minecraft account you run. Deploy, type orders
            in plain English, and watch the plan execute line by line.
          </p>

          <ul className="mt-7 flex flex-col gap-3">
            {[
              "Email-only access — no passwords, no shortcuts",
              "Simulation mode works without a server",
              "Worker key lives in your own console",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 size-3 shrink-0 border-2 border-nb-ink bg-nb-lime" />
                <span className="text-sm leading-6">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 max-w-sm border-[3px] border-nb-ink bg-nb-ink p-4 text-nb-paper shadow-[6px_6px_0_0_var(--color-nb-lime)]">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-nb-lime">
              <RadioTower className="size-3.5" /> Runtime heartbeat
            </p>
            <p className="mt-2 font-mono text-[11px] leading-6 text-nb-paper/80">
              <span className="text-nb-lime">[worker]</span> connected as Pioneer
              <br />
              <span className="text-nb-lime">[worker]</span> claimed: guard the
              base
              <br />
              <span className="text-nb-paper/50">[idle]</span> waiting for the
              next order
            </p>
          </div>
        </section>

        <section className="nb-panel">
          <div className="flex items-center justify-between gap-3 border-b-[3px] border-nb-ink bg-nb-lime px-4 py-2.5">
            <span className="nb-label">Auth / operator</span>
            <LogoMark className="size-6 border-2 shadow-none" />
          </div>

          <div className="p-5 sm:p-6">
            {step === "signIn" ? (
              <>
                <h2 className="font-display text-2xl tracking-tight uppercase">
                  Operator sign-in
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  No password, no shortcuts. Drop your email and we send a
                  six-digit access code.
                </p>

                <form onSubmit={handleEmailSubmit} className="mt-5">
                  <label className="nb-label text-muted-foreground" htmlFor="email">
                    Operator email
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="h-11 pl-9"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {error && (
                    <p className="mt-3 border-2 border-nb-ink bg-nb-red px-3 py-2 font-mono text-[11px]">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="mt-4 h-11 w-full px-4"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Sending code…
                      </>
                    ) : (
                      <>
                        Send access code
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <p className="mt-3 text-center font-mono text-[9px] leading-4 uppercase tracking-[0.12em] text-muted-foreground">
                    First time here? Your operator account is created when you
                    verify the code.
                  </p>
                </form>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl tracking-tight uppercase">
                  Code sent
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  A six-digit access code is on its way to{" "}
                  <span className="font-mono text-[12px] text-nb-ink">
                    {step.email}
                  </span>
                  . It expires in 15 minutes.
                </p>

                <form onSubmit={handleOtpSubmit} className="mt-5">
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />

                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          otp.length === 6 &&
                          !isLoading
                        ) {
                          const form = (event.target as HTMLElement).closest("form");
                          if (form) form.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {error && (
                    <p className="mt-3 border-2 border-nb-ink bg-nb-red px-3 py-2 text-center font-mono text-[11px]">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="mt-5 w-full"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Verifying…
                      </>
                    ) : (
                      <>
                        Verify code <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <div className="mt-2 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setStep("signIn")}
                      disabled={isLoading}
                    >
                      Use a different email
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t-[3px] border-nb-ink bg-nb-sand px-4 py-2.5">
            <span className="nb-label text-muted-foreground">
              Email OTP · operator access
            </span>
            <Link
              to="/"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] underline decoration-2 underline-offset-2 hover:bg-nb-lime"
            >
              BotArena
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
