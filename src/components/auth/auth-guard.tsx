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
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
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
  const { mode, user, busy, error, signInWithGoogle } = useAuth();

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
          className="panel-hud scanlines mx-4 flex w-full max-w-md flex-col items-center gap-5 rounded-2xl p-10 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="grid size-16 place-items-center rounded-2xl border border-primary/40 bg-primary/10 glow-box-violet"
          >
            <Fingerprint className="size-8 text-primary" strokeWidth={1.5} />
          </motion.div>

          <div>
            <h1 className="font-display text-xl font-bold tracking-wide text-foreground">
              RESTRICTED AREA
            </h1>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              Omni Tool&apos;s modules are locked behind your Google identity.
              Authenticate to restore access to the full suite.
            </p>
          </div>

          <motion.button
            onClick={() => void signInWithGoogle()}
            disabled={busy}
            whileTap={busy ? undefined : { scale: 0.97 }}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border/60 bg-white px-4 font-display text-xs font-bold tracking-[0.14em] text-zinc-900 transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            <GoogleMark className="size-5" />
            {busy ? "CONNECTING…" : "SIGN IN WITH GOOGLE"}
          </motion.button>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-red-300"
                role="alert"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
            processing stays on-device · auth guards access only
          </p>
        </motion.div>
      </div>
    );
  }

  /* configured + signed in → full access ----------------------------------- */
  return <>{children}</>;
}
