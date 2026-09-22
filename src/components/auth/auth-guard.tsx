"use client";

/**
 * AuthGuard — Enterprise Multi-Device Google Account Chooser & Security Gate.
 *
 * Authored under Ponytail, GSD, Ralph Loop, and CodeRabbit guardrails.
 */

import { Loader2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { UnifiedLoginCard } from "@/components/auth/unified-login-card";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { mode, user } = useAuth();

  /* 1. Probing State ----------------------------------------------------- */
  if (mode === "probing") {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Verifying Identity Session…
          </p>
        </div>
      </div>
    );
  }

  /* 2. Open Mode (Gate disengaged) --------------------------------------- */
  if (mode === "unconfigured") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="font-mono text-[11px] leading-relaxed text-amber-200/90">
            <span className="font-semibold">Open Mode Active</span> — The security gate is
            disengaged. All tools are fully unlocked without login.
          </p>
        </div>
        {children}
      </div>
    );
  }

  /* 3. Configured + Signed Out: Universal Responsive Login Experience ---- */
  if (!user) {
    return (
      <div className="flex min-h-[calc(100dvh-7rem)] w-full items-center justify-center px-3 py-4 sm:px-4 sm:py-8">
        <UnifiedLoginCard />
      </div>
    );
  }

  /* 4. Configured + Signed In → Render Protected Children ------------------ */
  return <>{children}</>;
}
