"use client";

/**
 * AuthGuard — In-Tab Google Account Chooser & Security Gate.
 *
 *  probing        → splash (session probing)
 *  unconfigured   → children + amber "open mode" banner (app never bricks)
 *  configured     → signed-in: children · signed-out: interactive Google Account Chooser
 *
 * Designed with Ponytail (instant 1-click execution, no broken iframes),
 * GSD, Ralph Loop, and CodeRabbit guardrails.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth, DEFAULT_SUGGESTED_ACCOUNTS, type AuthUser } from "@/lib/auth/auth-context";
import { UserAvatar } from "@/components/auth/user-avatar";

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

export function AuthGuard({ children }: { children: ReactNode }) {
  const {
    mode,
    user,
    savedAccounts,
    busy,
    error,
    signInWithGoogle,
    signInWithGoogleEmail,
    switchAccount,
    removeSavedAccount,
    continueAsGuest,
  } = useAuth();

  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [emailInputError, setEmailInputError] = useState<string | null>(null);

  // Active or primary detected account (defaults to Tank if no prior session)
  const primaryAccount: AuthUser =
    savedAccounts.length > 0 ? savedAccounts[0] : DEFAULT_SUGGESTED_ACCOUNTS[0];

  const otherAccounts = savedAccounts.filter(
    (a) => a.uid !== primaryAccount.uid && a.email?.toLowerCase() !== primaryAccount.email?.toLowerCase()
  );

  const handleCustomAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailInputError(null);
    const email = customEmail.trim();
    if (!email || !email.includes("@")) {
      setEmailInputError("Please enter a valid Gmail address (e.g. name@gmail.com).");
      return;
    }
    signInWithGoogleEmail(email, customName.trim() || undefined);
    setCustomEmail("");
    setCustomName("");
    setShowAccountPicker(false);
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
            <span className="font-semibold">open mode</span> — the security gate is
            disengaged because no Firebase credentials were detected. All modules
            remain fully usable. Open the{" "}
            <span className="font-semibold">Auth Gateway</span> to enable Google Sign-In
            protection.
          </p>
        </div>
        {children}
      </div>
    );
  }

  /* configured + signed out → Native In-Tab Google Account Chooser --------- */
  if (!user) {
    return (
      <div className="grid min-h-[75vh] place-items-center py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-outline-variant/60 bg-surface-container-low/95 p-6 sm:p-8 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
        >
          {/* Header Icon */}
          <div className="relative">
            <div className="grid size-14 place-items-center rounded-2xl border border-primary/40 bg-primary/10 shadow-sm glow-box-violet">
              <Lock
                className="size-7 text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                strokeWidth={2.2}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-surface-container border border-outline-variant/60 shadow-xs">
              <GoogleMark className="size-3.5" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center">
            <h1 className="font-headline text-lg sm:text-xl font-bold tracking-wide text-on-surface">
              GOOGLE ACCOUNT LOGIN
            </h1>
            <p className="mt-1.5 font-body text-xs sm:text-[13px] leading-relaxed text-on-surface-variant max-w-sm mx-auto">
              Click below to sign in directly or choose another Google account.
            </p>
          </div>

          {/* Account Chooser & Login Actions */}
          <div className="w-full space-y-3">
            {/* Primary / Detected Google Account Button (100% Reliable In-Tab Sign-In) */}
            <button
              type="button"
              onClick={() => switchAccount(primaryAccount)}
              disabled={busy}
              className="group relative flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200/30 bg-white px-4 py-3 shadow-md hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer text-zinc-900 active:scale-[0.99]"
              title={`Sign in as ${primaryAccount.displayName || primaryAccount.email}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid size-9 place-items-center rounded-full bg-[#d93025] text-white font-bold text-sm shrink-0 shadow-xs">
                  {primaryAccount.displayName?.[0] || "T"}
                </div>
                <div className="text-left min-w-0">
                  <p className="font-headline font-semibold text-xs sm:text-[13px] text-zinc-900 group-hover:text-primary transition-colors truncate">
                    Sign in as {primaryAccount.displayName || "Tank"}
                  </p>
                  <p className="font-mono text-[11px] text-zinc-600 truncate">
                    {primaryAccount.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <GoogleMark className="size-5" />
              </div>
            </button>

            {/* Clickable Choose Another Account Toggle */}
            <div className="w-full">
              <button
                type="button"
                onClick={() => setShowAccountPicker((prev) => !prev)}
                className="flex items-center justify-between w-full rounded-xl border border-outline-variant/60 bg-surface-container px-4 py-2.5 text-xs font-headline font-medium text-on-surface hover:border-primary/50 hover:bg-surface-container-high transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-primary" />
                  <span>Choose Another Google Account</span>
                </div>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                    showAccountPicker ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {showAccountPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pt-2.5 space-y-2.5"
                  >
                    {/* List of other saved accounts */}
                    {otherAccounts.length > 0 && (
                      <div className="space-y-1 rounded-xl border border-outline-variant/40 bg-surface-container/80 p-2">
                        <div className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          Switch to account
                        </div>
                        {otherAccounts.map((acc) => (
                          <div
                            key={acc.uid}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-container-high transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => switchAccount(acc)}
                              className="flex flex-1 items-center gap-2.5 text-left min-w-0 cursor-pointer"
                            >
                              <UserAvatar user={acc} size="sm" showGoogleBadge={true} />
                              <div className="min-w-0">
                                <p className="truncate font-headline text-xs font-semibold text-on-surface">
                                  {acc.displayName || "Google User"}
                                </p>
                                <p className="truncate font-mono text-[10px] text-muted-foreground">
                                  {acc.email}
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSavedAccount(acc.uid)}
                              className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-red-500/15 hover:text-red-400 transition-colors cursor-pointer"
                              title="Remove from device"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form to enter any new Google account */}
                    <form
                      onSubmit={handleCustomAccountSubmit}
                      className="rounded-xl border border-primary/40 bg-surface-container p-3.5 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs font-headline font-semibold text-on-surface">
                        <div className="flex items-center gap-1.5">
                          <Plus className="size-3.5 text-primary" />
                          <span>Use Another Google Account</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-mono text-muted-foreground mb-1">
                          Gmail or Google Workspace Email:
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. yourname@gmail.com"
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 font-mono text-xs text-on-surface placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-mono text-muted-foreground mb-1">
                          Display Name (optional):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tank"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 font-body text-xs text-on-surface placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                        />
                      </div>

                      {emailInputError && (
                        <p className="text-[10.5px] text-red-400 font-body">{emailInputError}</p>
                      )}

                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 font-headline text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                      >
                        <GoogleMark className="size-3.5" />
                        <span>Sign In with This Account</span>
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Launch Google OAuth Popup (Pure Popup Window) */}
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-container px-4 py-2.5 text-xs font-headline font-medium text-on-surface hover:border-primary/50 hover:bg-surface-container-high transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <GoogleMark className="size-4" />
              <span>
                {busy ? "Opening Google OAuth Popup…" : "Launch Google OAuth Popup"}
              </span>
            </button>

            {/* Offline Sandbox Mode Bypass */}
            <div className="pt-2 text-center border-t border-outline-variant/40">
              <button
                onClick={() => continueAsGuest()}
                type="button"
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors py-1 underline underline-offset-4 cursor-pointer"
              >
                Continue as Guest (Offline Sandbox Mode)
              </button>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground/70">
                Permanently unlocks all media tools on this browser
              </p>
            </div>
          </div>

          {/* Error Notice & Failover Actions */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-2xl border border-red-400/30 bg-red-500/10 p-4 font-body text-xs text-left leading-relaxed text-red-300 space-y-2.5"
                role="alert"
              >
                <div className="font-semibold text-red-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="size-4" />
                    <span>Authentication Notice</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => continueAsGuest()}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 font-mono text-[10.5px] cursor-pointer transition-colors"
                  >
                    Bypass & Open Tools
                  </button>
                </div>

                <p className="font-mono text-[11px] text-red-200/90 break-words">
                  {error}
                </p>
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
