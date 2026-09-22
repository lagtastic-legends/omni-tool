"use client";

/**
 * AuthGuard — config-driven security around the tool surface.
 *
 *  probing        → splash (session unknown yet)
 *  unconfigured   → children + amber "open mode" banner (app never bricks)
 *  configured     → signed-in: children · signed-out: lock screen
 *
 * The Auth Gateway module itself renders ABOVE the gate (it must remain
 * reachable to sign in) — app-shell handles that exception.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Lock, Loader2, ShieldCheck, Users } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.6c-.1 1.1-.9 2.8-2.4 3.9l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.6 2.8-.05.13C3.6 21.3 7.5 24 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.4c-.3-.8-.4-1.6-.4-2.4s.2-1.7.4-2.4l-.01-.16-3.7-2.8-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.5 5.4l3.8-3z" />
      <path fill="#EA4335" d="M12 4.6c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.5 0 3.6 2.7 1.5 6.6l3.8 3c.9-2.9 3.6-5 6.7-5z" />
    </svg>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { mode, user, busy, error, isNative, signInWithGoogle, signInWithIdToken, continueAsGuest } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    const isGuest = typeof window !== "undefined" && sessionStorage.getItem("omni_guest_session") === "true";
    if (mode === "configured" && !user && !isNative && !isGuest) {
      // Avoid auto-triggering FedCM origin mismatch errors on localhost development
      if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        return;
      }

      const initGsi = () => {
        if ((window as any).google?.accounts?.id) {
          try {
            (window as any).google.accounts.id.initialize({
              client_id: "1006411301114-q48l1fmvbiba3rq6u1s59qgl13c57sd1.apps.googleusercontent.com",
              auto_select: false,
              itp_support: true,
              callback: (response: any) => {
                if (response?.credential) {
                  void signInWithIdToken(response.credential);
                }
              },
            });

            if (googleBtnRef.current) {
              (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
                type: "standard",
                theme: "outline",
                size: "large",
                text: "signin_with",
                shape: "rectangular",
                logo_alignment: "left",
                width: 320,
              });
              setGsiReady(true);
            }

            // Also pop up in-tab Google Account Chooser automatically
            (window as any).google.accounts.id.prompt();
          } catch (e) {
            console.warn("Google Identity Services setup:", e);
          }
        }
      };

      if ((window as any).google?.accounts?.id) {
        initGsi();
      } else {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = initGsi;
        document.body.appendChild(script);
        return () => {
          try {
            if ((window as any).google?.accounts?.id) {
              (window as any).google.accounts.id.cancel();
            }
            if (script.parentNode) {
              script.parentNode.removeChild(script);
            }
          } catch {
            // ignore
          }
        };
      }
    }
  }, [mode, user, isNative, signInWithIdToken]);

  const handleSignInClick = () => {
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          void signInWithGoogle();
        }
      });
      return;
    }
    void signInWithGoogle();
  };

  const handleChooseAnotherAccount = () => {
    if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: "1006411301114-q48l1fmvbiba3rq6u1s59qgl13c57sd1.apps.googleusercontent.com",
          scope: "email profile openid",
          prompt: "select_account",
          callback: (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              void signInWithIdToken(null, tokenResponse.access_token);
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (e) {
        console.warn("OAuth2 select_account error:", e);
      }
    }
    void signInWithGoogle();
  };

  /* probe splash --------------------------------------------------------- */
  if (mode === "probing") {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            probing identity layer…
          </p>
        </div>
      </div>
    );
  }

  /* open mode — gate disengaged, banner explains why ---------------------- */
  if (mode === "unconfigured") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="font-mono text-[11px] leading-relaxed text-amber-200/90">
            <span className="font-semibold">open mode</span> — the security
            gate is disengaged because no Firebase credentials were detected.
            All modules remain fully usable. Open the{" "}
            <span className="font-semibold">Auth Gateway</span> to enable
            Google Sign-In protection.
          </p>
        </div>
        {children}
      </div>
    );
  }

  /* configured + signed out → lock screen --------------------------------- */
  if (!user) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-4 flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-outline-variant/60 bg-surface-container-low p-10 text-center shadow-[0_2px_16px_rgba(58,48,42,0.04)]"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1], rotateX: [0, 10, 0], rotateY: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="grid size-16 place-items-center rounded-2xl border border-outline-variant/60 bg-surface-container shadow-sm"
            style={{ perspective: 1000 }}
          >
            <Lock 
              className="size-8 text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" 
              strokeWidth={2.5} 
            />
          </motion.div>

          <div>
            <h1 className="font-headline text-xl font-semibold tracking-wide text-on-surface">
              RESTRICTED AREA
            </h1>
            <p className="mt-2 font-body text-[13px] leading-relaxed text-on-surface-variant">
              ZenoDeck&apos;s modules are locked behind your Google identity.
              Authenticate to restore access to the full suite.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2.5 w-full">
            {/* Google Identity Services official in-tab account picker */}
            <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />

            <button
              onClick={handleChooseAnotherAccount}
              type="button"
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container px-4 py-2.5 text-xs font-headline font-medium text-on-surface hover:border-primary/50 hover:bg-surface-container-high transition-all cursor-pointer w-full shadow-sm"
            >
              <Users className="size-3.5 text-primary" />
              <span>Choose Another Google Account</span>
            </button>

            {!gsiReady && (
              <motion.button
                onClick={handleSignInClick}
                disabled={busy}
                whileTap={busy ? undefined : { scale: 0.97 }}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-transparent bg-white px-4 font-headline text-sm font-semibold tracking-wider text-zinc-900 shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-60 cursor-pointer"
              >
                <GoogleMark className="size-5" />
                {busy ? "CONNECTING..." : "SIGN IN WITH GOOGLE"}
              </motion.button>
            )}

            <button
              onClick={() => continueAsGuest()}
              type="button"
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors py-1.5 underline underline-offset-4 cursor-pointer"
            >
              Continue as Guest (Offline Sandbox Mode)
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-xl border border-red-400/30 bg-red-500/10 p-3 font-body text-xs text-left leading-relaxed text-red-300 space-y-2"
                role="alert"
              >
                <div className="font-semibold text-red-400 flex items-center gap-1.5">
                  <span>Authentication Notice:</span>
                </div>
                <div className="font-mono text-[11.5px] break-all">{error}</div>
                {error.includes("unauthorized-domain") && (
                  <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-white/10 text-[11px] text-zinc-300 font-sans space-y-1.5">
                    <p className="font-semibold text-amber-300">⚙️ How to authorize this domain:</p>
                    <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-[11px]">
                      <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline text-primary hover:text-primary/80">Firebase Console</a> (Project: <code className="bg-black/50 px-1 py-0.5 rounded text-amber-200">omni-tool-7ba2d</code>)</li>
                      <li>Go to <strong>Authentication &rarr; Settings &rarr; Authorized domains</strong></li>
                      <li>Add <code className="bg-black/50 px-1 py-0.5 rounded text-white font-mono">{typeof window !== "undefined" ? window.location.hostname : "vercel.app"}</code> or <code className="bg-black/50 px-1 py-0.5 rounded text-white font-mono">vercel.app</code></li>
                    </ol>
                    <p className="pt-1 text-[10.5px] text-zinc-400">Or tap <strong>Continue as Guest</strong> above to use all tools immediately.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="font-label text-[10px] font-bold uppercase tracking-widest text-secondary/70">
            processing stays on-device · auth guards access only
          </p>
        </motion.div>
      </div>
    );
  }

  /* configured + signed in → full access ----------------------------------- */
  return <>{children}</>;
}
