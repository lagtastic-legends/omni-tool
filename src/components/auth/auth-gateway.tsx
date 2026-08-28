"use client";

/**
 * AUTH GATEWAY — Google Sign-In management surface.
 *
 * Configured: sign-in button, live profile card, sign-out.
 * Unconfigured: step-by-step setup guide (Firebase console →
 * google-services.json → SHA-1 fingerprints) so a maintainer can light the
 * gate up in minutes.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Fingerprint,
  KeyRound,
  LogOut,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.6c-.1 1.1-.9 2.8-2.4 3.9l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.6 2.8-.05.13C3.6 21.3 7.5 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.4c-.3-.8-.4-1.6-.4-2.4s.2-1.7.4-2.4l-.01-.16-3.7-2.8-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.5 5.4l3.8-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.5 0 3.6 2.7 1.5 6.6l3.8 3c.9-2.9 3.6-5 6.7-5z"
      />
    </svg>
  );
}

export function AuthGateway() {
  const { mode, user, busy, error, isNative, signInWithGoogle, signOut } =
    useAuth();

  const configured = mode === "configured";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* ------------------------------------------------------ session side */}
      <div className="space-y-5">
        <div className="panel-hud scanlines space-y-5 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 glow-box-violet">
              <Fingerprint className="size-6 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-wide text-foreground">
                Identity
              </h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                google sign-in · {isNative ? "native android" : "web popup"}
              </p>
            </div>
          </div>

          {mode === "probing" ? (
            <p className="animate-pulse font-mono text-[11px] text-muted-foreground">
              probing firebase configuration…
            </p>
          ) : user ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4 rounded-xl border border-pulse/30 bg-pulse/5 p-4">
                {user.photoURL && !imgError ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="size-12 rounded-full border border-pulse/40"
                      onError={() => setImgError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="grid size-12 place-items-center rounded-full border border-pulse/40 bg-pulse/10 font-display text-lg font-bold text-pulse">
                    {(user.displayName ?? user.email ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-foreground">
                    {user.displayName ?? "Google user"}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {user.email ?? "no email"}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-pulse/30 bg-pulse/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-pulse">
                    <ShieldCheck className="size-3" />
                    authenticated · {user.providerId}
                  </p>
                </div>
              </div>

              <motion.button
                onClick={() => void signOut()}
                disabled={busy}
                whileTap={busy ? undefined : { scale: 0.97 }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/50 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
              >
                <LogOut className="size-4" />
                {busy ? "SIGNING OUT…" : "SIGN OUT"}
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {configured ? (
                <>
                  <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                    Sign in to unlock every module in the suite. Your session
                    lives in this browser only — processed media never leaves
                    the device either way.
                  </p>
                  <motion.button
                    onClick={() => void signInWithGoogle()}
                    disabled={busy}
                    whileTap={busy ? undefined : { scale: 0.97 }}
                    className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border/60 bg-white px-4 font-display text-xs font-bold tracking-[0.14em] text-zinc-900 transition-transform hover:scale-[1.01] disabled:opacity-60"
                  >
                    <GoogleMark className="size-5" />
                    {busy ? "CONNECTING…" : "SIGN IN WITH GOOGLE"}
                  </motion.button>
                  <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground">
                    By signing in, you agree to our <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
                  </p>
                </>
              ) : (
                <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-amber-300">
                  open mode — firebase credentials not detected. The suite runs
                  ungated; complete the setup on the right to engage the
                  security gate.
                </p>
              )}
              {error && (
                <p
                  className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-red-300"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* security posture */}
        <div className="panel-hud space-y-3 rounded-xl p-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neon/90">
            security posture
          </p>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">firebase project</span>
              <span className={configured ? "text-pulse" : "text-amber-300"}>
                {configured ? "linked" : "not linked"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">dashboard gate</span>
              <span className={configured ? "text-pulse" : "text-amber-300"}>
                {configured ? "enforced" : "open mode"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">media processing</span>
              <span className="text-pulse">always on-device</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">vault storage</span>
              <span className="text-pulse">indexeddb · local</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
