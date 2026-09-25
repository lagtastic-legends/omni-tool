"use client";

import { motion } from "framer-motion";
import { Download, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useAuth } from "@/lib/auth/auth-context";
import { SearchPalette } from "@/components/shell/search-palette";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { AudioToggle } from "@/components/shell/audio-toggle";
import { UserAvatar } from "@/components/auth/user-avatar";
import { useNavStore } from "@/lib/navigation/nav-store";
import { usePwaStore } from "@/lib/pwa/pwa-store";
import type { EngineState } from "@/types/omni";

const STATE_META: Record<
  EngineState,
  { label: string; dotClass: string; textClass: string }
> = {
  idle: {
    label: "ENGINE STANDBY",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
  },
  loading: {
    label: "ENGINE BOOTING",
    dotClass: "bg-amber-400",
    textClass: "text-amber-300",
  },
  ready: {
    label: "ENGINE ONLINE",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-300",
  },
  error: {
    label: "ENGINE FAULT",
    dotClass: "bg-red-400",
    textClass: "text-red-300",
  },
};

export function TopBar() {
  const { state } = useFFmpegEngine();
  const { mode, user, signOut, isNative } = useAuth();
  const navigate = useNavStore((s) => s.navigate);
  const setDownloadModalOpen = usePwaStore((s) => s.setDownloadModalOpen);
  const meta = STATE_META[state];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl shrink-0 pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="relative grid size-9 sm:size-10 place-items-center rounded-xl border border-primary/40 overflow-hidden glow-box-violet"
            >
              <img src="/logo.jpg" alt="ZenoDeck" className="w-full h-full object-cover" />
            </motion.div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-xs sm:text-sm font-bold tracking-[0.24em] sm:tracking-[0.32em] text-foreground">
              ZENODECK
            </span>
            <span className="mt-0.5 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
              client-side media suite
            </span>
          </div>
        </div>

        {/* Status cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* auth state chip */}
          {mode === "unconfigured" ? (
            <div
              className="hidden items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5 md:flex"
              title="Firebase credentials not detected — the security gate is disengaged"
            >
              <ShieldAlert className="size-3 text-amber-300" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
                open mode
              </span>
            </div>
          ) : null}

          <div
            className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-border/70 bg-card/60 px-2.5 sm:px-3 py-1.5"
            role="status"
            aria-live="polite"
            title={`Engine Status: ${meta.label}`}
          >
            <motion.span
              animate={
                state === "loading" ? { scale: [1, 1.45, 1], opacity: [1, 0.6, 1] } : {}
              }
              transition={
                state === "loading"
                  ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
              className={`size-1.5 rounded-full ${meta.dotClass} ${
                state === "ready"
                  ? "shadow-[0_0_10px_oklch(0.75_0.18_162/0.9)]"
                  : ""
              }`}
            />
            <span
              className={`hidden sm:inline font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${meta.textClass}`}
            >
              {meta.label}
            </span>
          </div>

          <ThemeToggle />
          <AudioToggle />
          <SearchPalette />

          {!isNative ? (
            <button
              type="button"
              onClick={() => setDownloadModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary hover:bg-primary/20 hover:border-primary/60 transition-all font-mono text-[10px] uppercase tracking-wider cursor-pointer"
              title="Download Android APK or Install Web App"
            >
              <Download className="size-3 shrink-0" />
              <span className="hidden xs:inline sm:inline">Get App</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("omni:show-permissions"));
                }
              }}
              className="grid size-8 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground cursor-pointer"
              title="Manage Device Permissions"
              aria-label="Manage Device Permissions"
            >
              <ShieldCheck className="size-3.5 text-primary/80" />
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate("auth-gateway")}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 pl-1 pr-2.5 py-1 shadow-xs hover:border-primary/50 hover:bg-card transition-all cursor-pointer"
                title={`Account: ${user.email ?? user.displayName} — click to manage or switch accounts`}
              >
                <UserAvatar user={user} size="sm" showGoogleBadge={true} />
                <span className="hidden xs:inline sm:inline max-w-20 sm:max-w-28 truncate font-medium text-xs text-foreground">
                  {(user.displayName ?? user.email ?? "user").split(" ")[0]}
                </span>
              </button>
              <button
                onClick={() => void signOut()}
                aria-label="Sign out"
                title="Sign out"
                className="grid size-7 sm:size-8 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-300 cursor-pointer"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("auth-gateway")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary font-display text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
            >
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}

